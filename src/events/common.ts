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

    private async getTether(): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(pathToStravaConfig, "utf8", (err, data) => {
                if (err) {
                    console.log("Failed to read stravaconfig.json");
                    reject(new Error("Failed to read stravaconfig.json"));
                    return;
                }
                try {
                    const stravaConfig = JSON.parse(data);
                    resolve(stravaConfig.tether);
                } catch (e) {
                    console.log("Failed to parse stravaconfig.json");
                    reject(new Error("Failed to parse stravaconfig.json"));
                }
            });
        });
    }

    @On()
    async stravaEvent(
        confirmation: [StravaEvent],
        client: Client
    ): Promise<void> {
        console.log("Strava Event", confirmation[0]);
        try {
            const tether = await this.getTether();
            const eventDate = new Date(confirmation[0].event_time * 1000);
            const formattedDate = eventDate.toLocaleString();
            (client.channels.cache.get(tether) as TextChannel).send(
                "Strava event received! Someone did something on " +
                    formattedDate
            );
            console.log("Tether:", tether);
        } catch (error) {
            console.error("An error occurred:", error);
        }
    }
}
