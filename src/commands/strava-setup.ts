import type { CommandInteraction } from "discord.js";
import { Discord, Slash } from "discordx";
import * as fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const stravaSubscriptionsUrl =
    "https://www.strava.com/api/v3/push_subscriptions";
const ngrokAPIUrl = "https://api.ngrok.com/endpoints";
const domainName = "https://stickerchart.org";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathToStravaConfig = path.resolve(__dirname, "../../stravaconfig.json");

type subscription = {
    id: number;
    resource_state: number;
    application_id: number;
    callback_url: string;
    created_at: string;
    updated_at: string;
};

@Discord()
export class Example {
    @Slash({
        description: "Start or reset the Strava integration",
        name: "strava-setup",
    })
    async slashStravaSetup(command: CommandInteraction): Promise<void> {
        await this.stravaSetup(command);
    }

    @Slash({
        description:
            "Test that the bot is awake by asking it to send a message",
        name: "ping",
    })
    async slashPing(command: CommandInteraction): Promise<void> {
        await command.reply("Pong!");
    }

    private async stravaSetup(command: CommandInteraction): Promise<void> {
        try {
            await this.writeTether(
                this.validateGuildId(command.guildId),
                command.channelId
            );
            if (await this.linksMatch()) {
                await command.reply(
                    "Strava integration tethered to this channel!"
                );
                return;
            }
            await this.deleteStravaSubscription();
            await this.createStravaSubscription();
            await command.reply(
                "Strava integration setup complete! Tethered to this channel."
            );
        } catch (e) {
            console.log("Failed to setup Strava integration");
            await command.reply("Failed to setup Strava integration");
        }
    }

    @Slash({
        description: "Get current public tunnel URL",
        name: "get-url",
    })
    async slashGetUrl(command: CommandInteraction): Promise<void> {
        try {
            const url = await this.getNgrokUrl();
            await command.reply(
                `[Serotonin's current public link!](${url}) (as of this message)`
            );
        } catch (e) {
            console.log("Failed to get ngrok url");
            await command.reply("Failed to get public url");
        }
    }

    private validateGuildId(guildId: string | null): string {
        if (guildId === null) {
            console.log(
                "GuildID not found in slash command. User likely in DM.",
                guildId
            );
            throw new Error(
                "GuildID not found in slash command. User likely in DM."
            );
        }
        return guildId;
    }

    private async writeTether(
        guildId: string,
        channelId: string
    ): Promise<void> {
        fs.readFile(pathToStravaConfig, "utf8", (err, data) => {
            if (err) {
                console.log("Failed to read stravaconfig.json");
                throw new Error("Failed to read stravaconfig.json");
            }
            try {
                const stravaConfig = JSON.parse(data);

                let guildFound = false;

                for (const tether of stravaConfig.tethers) {
                    if (tether.guildId === guildId) {
                        if (tether.channelId === channelId) {
                            return;
                        } else {
                            guildFound = true;
                            tether.channelId = channelId;
                        }
                    }
                }

                if (!guildFound) {
                    stravaConfig.tethers.push({
                        guildId: guildId,
                        channelId: channelId,
                    });
                }

                fs.writeFile(
                    pathToStravaConfig,
                    JSON.stringify(stravaConfig, null, 4),
                    (err) => {
                        if (err) {
                            console.log(
                                "Failed to write tether to stravaconfig.json"
                            );
                            throw new Error(
                                "Failed to write tether to stravaconfig.json"
                            );
                        }
                    }
                );
            } catch (e) {
                console.log("Failed to parse stravaconfig.json");
                throw new Error("Failed to parse stravaconfig.json");
            }
        });
    }

    private async getSubscription(): Promise<subscription> {
        const getIdUrl = new URL(stravaSubscriptionsUrl);
        const getApplicationIdParams = {
            client_secret: String(process.env.STRAVA_CLIENT_SECRET),
            client_id: String(process.env.STRAVA_CLIENT_ID),
        };
        getIdUrl.search = new URLSearchParams(
            getApplicationIdParams
        ).toString();

        const response = await fetch(getIdUrl, {
            method: "GET",
        });
        if (!response.ok) {
            console.log("Failed to receive subscription from Strava");
            throw new Error(
                "Network response to fetch subscription was not ok"
            );
        }

        const data = await response.json();
        if (data.errors !== undefined) {
            console.log(
                "Fetched subscription from Strava, but errors were present",
                data.errors
            );
            throw new Error("Data from fetch subscription was not ok");
        }

        const subscription: subscription = data[0];
        return subscription;
    }

    private async linksMatch(): Promise<boolean> {
        let ngrokUrl: string;
        let subscriptionUrl: string;

        try {
            ngrokUrl = (await this.getNgrokUrl()) + "/webhook";
            subscriptionUrl = (await this.getSubscription()).callback_url;
        } catch (e) {
            console.log("Failed to compare ngrok and subscription urls");
            return false;
        }

        return ngrokUrl === subscriptionUrl;
    }

    private async getClientId(): Promise<string> {
        const subscription: subscription = await this.getSubscription();
        return String(subscription.id);
    }

    private async deleteStravaSubscription(): Promise<void> {
        const client_id = await this.getClientId();
        if (client_id === undefined) {
            console.log(
                "Failed to delete subscription from Strava, no client id found"
            );
            return;
        }

        const deleteParams = {
            client_secret: String(process.env.STRAVA_CLIENT_SECRET),
            client_id: String(process.env.STRAVA_CLIENT_ID),
            id: client_id,
        };
        const deleteUrl = new URL(stravaSubscriptionsUrl + "/" + client_id);
        deleteUrl.search = new URLSearchParams(deleteParams).toString();

        fetch(deleteUrl, {
            method: "DELETE",
        })
            .then((response) => {
                if (!response.ok) {
                    console.log("Failed to delete subscription from Strava");
                    throw new Error(
                        "Network response to strava-setup.ts::deleteStravaSubscription was not ok"
                    );
                }
            })
            .catch((error) => {
                console.error(
                    "There was a problem with the fetch operation at strava-setup.ts::deleteStravaSubscription:",
                    error
                );
            });
    }

    private async createStravaSubscription(): Promise<void> {
        const createUrl = new URL(stravaSubscriptionsUrl);
        const ngrokUrl = (await this.getNgrokUrl()) + "/webhook";
        console.log("ngrok url", ngrokUrl);
        const createParams = {
            client_secret: String(process.env.STRAVA_CLIENT_SECRET),
            client_id: String(process.env.STRAVA_CLIENT_ID),
            callback_url: ngrokUrl,
            verify_token: String(process.env.STRAVA_VERIFY_TOKEN),
        };
        createUrl.search = new URLSearchParams(createParams).toString();
        fetch(createUrl, { method: "POST" })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .catch((error) => {
                console.error(
                    "There was a problem with the post operation:",
                    error
                );
            });
    }

    private async getNgrokUrl(): Promise<string> {

        return domainName;


        const ngrokUrl = new URL(ngrokAPIUrl);
        const response = await fetch(ngrokUrl, {
            method: "GET",
            headers: {
                Authorization: "Bearer " + String(process.env.NGROK_API_KEY),
                "Ngrok-Version": "2",
            },
        });
        if (!response.ok) {
            console.log("Failed to receive ngrok url");
            throw new Error(
                "Network response to strava-setup.ts::getNgrokUrl was not ok"
            );
        }
        const data = await response.json();
        console.log("ngrok url data", data);
        return data.endpoints[0].public_url;
    }
}
