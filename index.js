const { App } = require('@slack/bolt');
const dotenv = require('dotenv');
dotenv.config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN
});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();

app.event('app_home_opened', async ({ event, client }) => {
    try {
        /* view.publish is the method that your app uses to push a view to the Home tab */
        const result = await client.views.publish({

            /* the user that opened your app's app home */
            user_id: event.user,

            /* the view object that appears in the app home*/
            view: {
                type: 'home',
                callback_id: 'home_view',

                /* body of the view */
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Приветствую вас в боте _Moderator_*"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Этот бот создан для модерации сообщений"
                        }
                    }
                ]
            }
        });
    }
    catch (error) {
        console.error(error);
    }
});

app.event('message', async ({ event, message, client, payload }) => {
    if (payload.hidden || message.bot_id) return;
    const channels = await client.conversations.list({ types: 'private_channel, public_channel' });

    const users = await client.users.list();
    const fromUser = users.ok && users.members.find(el => el.id === event.user);
    const worksChannel = channels.channels.find(el => el.id === event.channel);

    if (worksChannel.name !== 'разработка' || message.parent_user_id) return;

    try {
        await client.chat.delete({
            token: process.env.SLACK_USER_TOKEN,
            channel: event.channel,
            ts: event.ts
        });

        await client.chat.postEphemeral({
            user: event.user,
            channel: event.channel,
            text: "Ваше сообщение будет опубликовано после проверки модератором."
        });

        const channelName = "verify-channel";

        const channel = channels.channels.find(el => el.name === channelName);

        if (channel) {
            await app.client.chat.postMessage({
                channel: channel.id,
                text: message.text,
                blocks: [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": `Новое сообщение от <@${fromUser && fromUser.name}>`
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "plain_text",
                            "text": message.text
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Опубликовать сообщение в канале #разработка ?`
                        }
                    },
                    {
                        "type": "actions",
                        "block_id": "verify_actions",
                        "elements": [
                            {
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "text": "Отклонить"
                                },
                                "value": "ok",
                                "action_id": "verify_cancel_button"
                            },
                            {
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "text": "Подтвердить"
                                },
                                "value": fromUser.name,
                                "action_id": "verify_ok_button"
                            }
                        ]
                    }
                ]
            })
        }

    }
    catch (error) {
        console.error(error);
    }
});

app.action("verify_ok_button", async ({ ack, body, client, action }) => {
    await ack();

    const channels = await client.conversations.list();
    const redirectChannel = channels.channels.find(el => el.name === "разработка")

    try {
        await client.chat.postMessage({
            channel: redirectChannel.id,
            text: body.message.text,
            blocks: [
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "plain_text",
                        "text": `Сообщение от <@${action.value}>`
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "plain_text",
                        "text": `${body.message.text}`
                    }
                },
                {
                    "type": "divider"
                },
            ]
        });

        await client.chat.delete({
            channel: body.channel.id,
            ts: body.message.ts
        })
    } catch (e) {
        console.error(e)
    }
});

app.action("verify_cancel_button", async ({ ack, body, client }) => {
    await ack();

    try {
        await client.chat.delete({
            channel: body.channel.id,
            ts: body.message.ts
        })
    } catch (e) {
        console.error(e)
    }
});