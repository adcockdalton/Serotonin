import { Get, Post, Router } from "@discordx/koa";
import type { Context } from "koa";

import { bot } from "../main.js";

@Router()
export class API {
    // can build webpage here for Strava permissions and display

    @Post("/webhook")
    webhook(context: Context): void {
        console.log("webhook event received!");

        const body = context.request.body;
        bot.emit("stravaEvent", body);

        context.status = 200;
    }

    @Get("/webhook")
    subscribe(context: Context): void {
        console.log("webhook get request received!", context.query);
        const VERIFY_TOKEN = String(process.env.STRAVA_VERIFY_TOKEN);
        // Parses the query params
        let mode = context.query["hub.mode"];
        let token = context.query["hub.verify_token"];
        let challenge = context.query["hub.challenge"];
        // Checks if a token and mode is in the query string of the request
        if (mode && token) {
            // Verifies that the mode and token sent are valid
            if (mode === "subscribe" && token === VERIFY_TOKEN) {
                console.log("WEBHOOK_VERIFIED", challenge);
                context.response.body = { "hub.challenge": challenge };
            } else {
                context.status = 403;
            }
        }
    }
}
