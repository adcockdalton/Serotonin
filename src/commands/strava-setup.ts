import type { CommandInteraction } from "discord.js";
import {
    Discord,
    Slash,
} from "discordx";


@Discord()
export class Example {

    @Slash({ description: "Start or reset the Strava integration", name: "strava-setup" })
        async slashLikeIt(command: CommandInteraction): Promise<void> {
        await this.likeIt(command);
    }

    async likeIt(command: CommandInteraction): Promise<void> {
        await command.reply("I haven't implemented this yet :P");

        /*
        check if ngrok is open and its all working
        if not
            delete old subscription (will have to have clientid stored prior)
            open new ngrok
            grab ngrok link
            create new subscription and save returned clientid
            confrim its working and return
        */
    }
}
