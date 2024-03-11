import type { CommandInteraction } from "discord.js";
import { Discord, Slash } from "discordx";
import * as fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const stravaSubscriptionsUrl =
    "https://www.strava.com/api/v3/push_subscriptions";
const ngrokAPIUrl = "https://api.ngrok.com/endpoints";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathToStravaConfig = path.resolve(__dirname, "../../stravaconfig.json");

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
        description: "Move the Strava integration into the current channel",
        name: "strava-tether",
    })
    async slashStravaTether(command: CommandInteraction): Promise<void> {
        await this.writeTether(command.channelId);
        await command.reply("Strava integration tethered to this channel");
    }

    private async stravaSetup(command: CommandInteraction): Promise<void> {
        await this.confirmTether(command.channelId);
        await this.deleteStravaSubscription();
        await this.createStravaSubscription();
        await command.reply("Strava integration setup complete");
    }

    private async writeTether(channelId: string): Promise<void> {
        // decentralize this?
        fs.readFile(pathToStravaConfig, "utf8", (err, data) => {
            if (err) {
                console.log("Failed to read stravaconfig.json");
                throw new Error("Failed to read stravaconfig.json");
            }
            try {
                const stravaConfig = JSON.parse(data);
                stravaConfig.tether = channelId;

                fs.writeFile(
                    pathToStravaConfig,
                    JSON.stringify(stravaConfig, null, 4),
                    (err) => {
                        if (err) {
                            console.log("Failed to write to stravaconfig.json");
                            throw new Error(
                                "Failed to write to stravaconfig.json"
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

    private async confirmTether(channelId: string): Promise<void> {
        // combine with writeTether?
        fs.readFile(pathToStravaConfig, "utf8", (err, data) => {
            if (err) {
                console.log("Failed to read stravaconfig.json");
                throw new Error("Failed to read stravaconfig.json");
            }
            try {
                const stravaConfig = JSON.parse(data);
                if (stravaConfig.tether === "") {
                    stravaConfig.tether = channelId;

                    fs.writeFile(
                        pathToStravaConfig,
                        JSON.stringify(stravaConfig, null, 4),
                        (err) => {
                            if (err) {
                                console.log(
                                    "Failed to write to stravaconfig.json"
                                );
                                throw new Error(
                                    "Failed to write to stravaconfig.json"
                                );
                            }
                        }
                    );
                }
            } catch (e) {
                console.log("Failed to parse stravaconfig.json");
                throw new Error("Failed to parse stravaconfig.json");
            }
        });
    }

    private async getClientId(): Promise<string | undefined> {
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
            console.log("Failed to receive application id from Strava");
            throw new Error(
                "Network response to strava-setup.ts::getApplicationId was not ok"
            );
        }
        const data = await response.json();
        console.log("client id data", data);
        return data.length ? String(data[0].id) : undefined;
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
                return response.json(); // Assuming response is JSON
            })
            .catch((error) => {
                console.error(
                    "There was a problem with the post operation:",
                    error
                );
            });
    }

    private async getNgrokUrl(): Promise<string> {
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
