import { TextChannel } from "discord.js";
import type { ArgsOf, Client } from "discordx";
import { Discord, On } from "discordx";
import * as fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToStravaConfig = path.resolve(__dirname, "../../stravaconfig.json");

type StravaEvent = {
    object_type: string;
    object_id: number;
    aspect_type: string;
    updates: any;
    owner_id: number;
    subscription_id: number;
    event_time: number;
};

type tether = {
    guildId: string;
    channelId: string;
};

@Discord()
export class Example {
    @On()
    messageDelete([message]: ArgsOf<"messageDelete">, client: Client): void {
        console.log("Message Deleted", client.user?.username, message.content);
    }

    @On()
    ping(pingArgs: [string, string], client: Client): void {
        console.log("Ping Event received", pingArgs[0]);
        const channel = client.guilds.cache
            .get(pingArgs[0])
            ?.channels.cache.get(pingArgs[1]) as TextChannel;
        channel?.send("Pong from the internet!").catch(console.error);
    }

    private async getTethers(): Promise<tether[]> {
        return new Promise((resolve, reject) => {
            fs.readFile(pathToStravaConfig, "utf8", (err, data) => {
                if (err) {
                    console.log("Failed to read stravaconfig.json");
                    reject(new Error("Failed to read stravaconfig.json"));
                    return;
                }
                try {
                    const stravaConfig = JSON.parse(data);
                    resolve(stravaConfig.tethers);
                } catch (e) {
                    console.log("Failed to parse stravaconfig.json");
                    reject(new Error("Failed to parse stravaconfig.json"));
                }
            });
        }) as Promise<tether[]>;
    }

    @On()
    async stravaEvent(
        confirmation: [StravaEvent],
        client: Client
    ): Promise<void> {
        const event: StravaEvent = confirmation[0];
        console.log("Strava Event", event);

        try {
            const parsedMessage = this.parseWebhookEvent(event);

            const tethers = (await this.getTethers()) as tether[];
            tethers.forEach((tether) => {
                const guild = client.guilds.cache.get(tether.guildId);
                if (guild) {
                    const channel = guild.channels.cache.get(
                        tether.channelId
                    ) as TextChannel;
                    if (channel) {
                        channel.send(parsedMessage);
                        console.log("Webhook event sent to", tether);
                    }
                }
            });
        } catch (error) {
            console.error("An error occurred:", error);
        }
    }

    private parseWebhookEvent(event: StravaEvent): string {
        console.log("Strava Event", event);
        const eventDate = new Date(event.event_time * 1000);
        const formattedDate = eventDate.toLocaleTimeString();
        if (
            event.object_type === "activity" &&
            event.aspect_type === "create"
        ) {
            return `OMG!! At ${formattedDate} today, someone finished an activity on Strava! Check it out [here!](https://www.strava.com/activities/${event.object_id})`;
        } else {
            return `An event occurred on Strava! Someone's interacting with Strava, but it's not a new activity.`;
        }
    }
}
