import type { CommandInteraction } from "discord.js";
import {
    Discord,
    Slash,
} from "discordx";
import * as fs from "fs";

const pathToClientid = "../../clientid.json";
const stravaSubscriptionsUrl = "https://www.strava.com/api/v3/push_subscriptions";

@Discord()
export class Example {

    @Slash({ description: "Start or reset the Strava integration", name: "strava-setup" })
        async slashStravaSetup(command: CommandInteraction): Promise<void> {
        await this.stravaSetup(command);
    }

    async stravaSetup(command: CommandInteraction): Promise<void> {
        await command.reply("I haven't implemented this yet... but i'll delete the subscription :P");
        await this.deleteStravaSubscription();
        /*
        check if ngrok is open and its all working
        if not
            delete old subscription (will have to have clientid stored prior)
            open new ngrok
            grab ngrok link https://stackoverflow.com/questions/52937935/programmatic-ngrok-tunnel-url OR https://ngrok.com/docs/api/resources/endpoints/
            create new subscription and save returned clientid
            confrim its working and return
        */
    }

    async getClientId(): Promise<string> {
        const getIdUrl = new URL(stravaSubscriptionsUrl);
        const getApplicationIdParams = { "client_secret": String(process.env.STRAVA_CLIENT_SECRET), "client_id": String(process.env.STRAVA_CLIENT_ID)};
        getIdUrl.search = new URLSearchParams(getApplicationIdParams).toString();

        const response = await fetch(getIdUrl, {
            method: "GET",
        })
        if (!response.ok) {
            console.log("Failed to receive application id from Strava");
            throw new Error("Network response to strava-setup.ts::getApplicationId was not ok");
        }
        const data = await response.json();
        console.log("data", data);
        const client_id = String(data[0].id);
        console.log("client_id", client_id);
        return client_id;
    }

    async deleteStravaSubscription(): Promise<void> {
        const client_id = await this.getClientId();
        const deleteParams = { "client_secret": String(process.env.STRAVA_CLIENT_SECRET), "client_id": String(process.env.STRAVA_CLIENT_ID), "id": client_id};
        const deleteUrl = new URL(stravaSubscriptionsUrl + "/" + client_id);
        deleteUrl.search = new URLSearchParams(deleteParams).toString();

        fetch(deleteUrl, {
            method: "DELETE",
        })
          .then(response => {
            if (!response.ok) {
                console.log("Failed to delete subscription from Strava");
                throw new Error('Network response to strava-setup.ts::deleteStravaSubscription was not ok');
            }
        })
            .catch(error => {
                console.error('There was a problem with the fetch operation at strava-setup.ts::deleteStravaSubscription:', error);
            });
    }

    /*
    async createStravaSubscription(): Promise<void> {
        const createUrl = new URL(stravaSubscriptionsUrl);
        const createParams = { "client_secret": String(process.env.STRAVA_CLIENT_SECRET), "client_id": String(process.env.STRAVA_CLIENT_ID), "callback_url": TODO, "verify_token": String(process.env.STRAVA_VERIFY_TOKEN)};
        createUrl.search = new URLSearchParams(createParams).toString();
        fetch(createUrl, {method: "POST"})
          .then(response => {
            if (!response.ok) {
            throw new Error('Network response was not ok');
            }
            return response.json(); // Assuming response is JSON
        })
        .catch(error => {
            console.error('There was a problem with the post operation:', error);
        });

        // then save id
    }
    */
}
