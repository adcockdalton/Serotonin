import { Get, Post, Router } from "@discordx/koa";
import type { Context } from "koa";

import { bot } from "../main.js";

@Router()
export class API {
    // can build webpage here for Strava permissions and display
    @Get("/")
    index(context: Context): void {
        console.log("index request received");
        context.body = `
      <div style="text-align: center">
        <h1>
          Welcome to a <a href="https://www.youtube.com/watch?v=BHh-M3qi5Gw&pp=ygUQanVzdCBtb25pa2EgZGRsYw%3D%3D">Braincell Hell</a> Discord bot called "Serotonin!"
        </h1>
        <p>
          Visit [the current url]/ping/{guildId}/{channelId} to send a ping to a channel.
        </p>
      </div>
    `;
    }

    @Get("/ping/:guildId/:channelId")
    ping(context: Context): void {
        console.log("ping to api received");
        const guildId = context.params.guildId;
        const channelId = context.params.channelId;
        bot.emit("ping", String(guildId), String(channelId));
        context.body = `
          <div style="text-align: center">
        <h1>
          Emitted event to attempt to send "Pong from the internet!" to ${guildId}/${channelId}
        </h1>
                <p>
          Didn't get anything? Make sure you have the right guildId and channelId.
        </p>
        <p>
            You can find guildId and channelId by right clicking on servers and channels.
        </p>
        <p>
            But you need Discord developer mode enabled to do that!
        </p>
          </div>
        `;
    }

    @Get("/ping")
    badPing(context: Context): void {
        console.log("ping without parameters to api received");
        context.body = `
      <div style="text-align: center">
        <h1>
          <a href="https://youtu.be/wz0bmHAgdrY?si=cgrlJumAPwuy_w4w&t=6881">BAD TOUCH!</a> please include guildId and channelId.
        </h1>
        <p>
          Visit [the current url]/ping/{guildId}/{channelId} to send a ping to a channel.
        </p>
        <p>
            You can find guildId and channelId by right clicking on servers and channels.
        </p>
        <p>
            But you need Discord developer mode enabled to do that!
        </p>
      </div>
    `;
    }

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
