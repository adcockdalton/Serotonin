import { dirname, importx } from "@discordx/importer";
import { Koa } from "@discordx/koa";
import bodyParser from "koa-bodyparser";
import type { Interaction, Message } from "discord.js";
import { IntentsBitField } from "discord.js";
import { Client } from "discordx";
import dotenv from "dotenv";
dotenv.config();

export const bot = new Client({
    // To use only guild command
    // botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],

    // Discord intents
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.MessageContent,
    ],

    // Debug logs are disabled in silent mode
    silent: false,

    // Configuration for @SimpleCommand
    simpleCommand: {
        prefix: "!",
    },
});

bot.once("ready", async () => {
    // Make sure all guilds are cached
    // await bot.guilds.fetch();

    // Synchronize applications commands with Discord
    await bot.initApplicationCommands();

    // To clear all guild commands, uncomment this line,
    // This is useful when moving from guild commands to global commands
    // It must only be executed once
    //
    //  await bot.clearApplicationCommands(
    //    ...bot.guilds.cache.map((g) => g.id)
    //  );

    console.log("Bot started");
});

bot.on("interactionCreate", (interaction: Interaction) => {
    try {
        bot.executeInteraction(interaction);
    } catch (e) {
        console.log("Error in interactionCreate event");
        console.error(e);
    }
});

bot.on("messageCreate", async (message: Message) => {
    try {
        bot.executeCommand(message);
    } catch (e) {
        console.log("Error in messageCreate event");
        console.error(e);
    }
});

async function run() {
    // The following syntax should be used in the commonjs environment
    //
    // await importx(__dirname + "/{events,commands,api}/**/*.{ts,js}");

    // The following syntax should be used in the ECMAScript environment
    await importx(
        `${dirname(import.meta.url)}/{events,commands,api}/**/*.{ts,js}`
    );

    // Let's start the bot
    if (!process.env.BOT_TOKEN) {
        throw Error("Could not find BOT_TOKEN in your environment");
    }

    // Log in with your bot token
    await bot.login(process.env.BOT_TOKEN);

    // ************* rest api section: start **********

    // api: prepare server
    const server = new Koa({ globalMiddlewares: [bodyParser()] });

    // api: need to build the api server first
    await server.build();

    // api: let's start the server now
    const port = 3001;
    server.listen(port, () => {
        console.log(`discord api server started on ${port}`);
        console.log(`visit localhost:${port}/guilds`);
    });

    // ************* rest api section: end **********
}

void run();
