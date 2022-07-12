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

let moderationChannel = null;;
let channelForModeration = null;
let usersWithoutModeration = [];

app.event('app_home_opened', async ({ event, client, context }) => {
    try {

        const user = await client.users.info({ user: event.user });
        const users = await client.users.list();

        const transformedUsers = users.members.filter(user => usersWithoutModeration.includes(user.id))
            .map(user => `<@${user.name}>`);

        if (channelForModeration && moderationChannel) {
            await client.views.publish({
                user_id: event.user,
                view: {
                    "external_id": `${event.user}_id`,
                    "type": "home",
                    "blocks": user.user.is_admin ? [
                        {
                            "type": "header",
                            "text": {
                                "type": "plain_text",
                                "text": "Добро пожаловать в бот-Moderator!",
                                "emoji": true
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "plain_text",
                                "text": 'Данный бот позволяет Вам проверять перед публикацией сообщения, которые участники пространства публикуют в открытых каналах.',
                                "emoji": true
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "plain_text",
                                "text": `Каналы, сообщения в которых нужно отправлять на проверку: ${channelForModeration.map(el => `#${el.text.text}`).join(', ')}
Канал, куда отправлять сообщения на проверку перед публикацией: #${moderationChannel.text.text}
${transformedUsers?.length ? 'Пользователи без модерации: ' + transformedUsers.join(', ') : ''}`,
                                "emoji": true
                            }
                        },
                        {
                            "type": "actions",
                            "elements": [
                                {
                                    "type": "button",
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Настройка"
                                    },
                                    "value": event.user,
                                    "action_id": "moderator_action_settings"
                                }
                            ]
                        }
                    ] : [
                        {
                            "type": "header",
                            "text": {
                                "type": "plain_text",
                                "text": "Добро пожаловать в бот-Moderator!",
                                "emoji": true
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "plain_text",
                                "text": 'Данный бот позволяет Вам проверять перед публикацией сообщения, которые участники пространства публикуют в открытых каналах.',
                                "emoji": true
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "plain_text",
                                "text": `Каналы, сообщения в которых нужно отправлять на проверку: ${channelForModeration.map(el => `#${el.text.text}`).join(', ')}
Канал, куда отправлять сообщения на проверку перед публикацией: #${moderationChannel.text.text}`,
                                "emoji": true
                            }
                        },
                    ]
                }
            });
        } else {
            await client.views.publish({
                user_id: event.user,
                view: {
                    "external_id": `${event.user}_id`,
                    "type": "home",
                    "blocks": user.user.is_admin ? [
                        {
                            "type": "header",
                            "text": {
                                "type": "plain_text",
                                "text": "Добро пожаловать в бот-Moderator!",
                                "emoji": true
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "plain_text",
                                "text": `Каналы, сообщения в которых нужно отправлять на проверку: нету
Канал, куда отправлять сообщения на проверку перед публикацией: нету`,
                                "emoji": true
                            }
                        },
                        {
                            "type": "actions",
                            "elements": [
                                {
                                    "type": "button",
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Настройка"
                                    },
                                    "value": event.user,
                                    "action_id": "moderator_action_settings"
                                }
                            ]
                        }
                    ] : [
                        {
                            "type": "header",
                            "text": {
                                "type": "plain_text",
                                "text": "Добро пожаловать в бот-Moderator!",
                                "emoji": true
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "plain_text",
                                "text": `Каналы, сообщения в которых нужно отправлять на проверку: нету
Канал, куда отправлять сообщения на проверку перед публикацией: нету`,
                                "emoji": true
                            }
                        }
                    ]
                }
            });
        }
    }
    catch (error) {
        console.error(error);
    }
});

app.event('message', async ({ event, message, client, payload }) => {
    if (payload.hidden || message.bot_id || channelForModeration && !channelForModeration.some(el => el.value === event.channel)) return;
    if (usersWithoutModeration.includes(event.user)) return;
    const users = await client.users.list();
    const fromUser = users.ok && users.members.find(el => el.id === event.user);

    if (!moderationChannel || message.parent_user_id) return;

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

        await app.client.chat.postMessage({
            channel: moderationChannel.value,
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
                        "text": `Опубликовать сообщение в канале #${channelForModeration.find(el => el.value === event.channel).text.text} ?`
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
                            "value": `${channelForModeration.find(el => el.value === event.channel).text.text} ${fromUser && fromUser.name}`,
                            "action_id": "verify_ok_button",
                            "style": "primary"
                        }
                    ]
                }
            ]
        })
    }
    catch (error) {
        console.error(error);
    }
});

app.action("verify_ok_button", async ({ ack, body, client, action }) => {
    await ack();

    const channelToPost = channelForModeration.find(el => el.text.text === action.value.split(' ')[0]);

    try {
        await client.chat.postMessage({
            channel: channelToPost.value,
            text: body.message.text,
            blocks: [
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "plain_text",
                        "text": `Сообщение от <@${action.value.split(' ')[1]}>`
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

app.action("moderator_action_settings", async ({ ack, client, body, action, payload }) => {
    await ack();

    let channels = []

    const list = await client.conversations.list({ types: "public_channel,private_channel", token: process.env.SLACK_BOT_TOKEN });
    
    if (list.response_metadata.next_cursor) {
        const secList = await client.conversations.list({ types: "public_channel,private_channel", token: process.env.SLACK_BOT_TOKEN, cursor: list.response_metadata.next_cursor });
        channels = [...list.channels, ...secList.channels]
    } else {
        channels = list.channels
    }

    const channelsAsOptions = channels.map(ch => ({
        "text": {
            "type": "plain_text",
            "text": ch.name
        },
        "value": ch.id
    }))

    const transformedChannels = channelForModeration && channelForModeration.map(el => ({
        "value": el.value,
        "text": {
            "type": "plain_text",
            "text": el.text.text
        }
    }))

    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                "callback_id": "settings_callback",
                "type": "modal",
                "title": {
                    "type": "plain_text",
                    "text": "Moderator - настройка",
                    "emoji": true
                },
                "submit": {
                    "type": "plain_text",
                    "text": "Подтвердить",
                    "emoji": true
                },
                "close": {
                    "type": "plain_text",
                    "text": "Отмена",
                    "emoji": true,

                },
                "blocks": [
                    {
                        "block_id": "channel_for_moderation",
                        "type": "input",
                        "element": channelForModeration ? {
                            "type": "multi_static_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Выберите канал для модерации",
                                "emoji": true
                            },
                            "options": channelsAsOptions,
                            "action_id": "static_select-action",
                            "initial_options": transformedChannels
                        } : {
                            "type": "multi_static_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Выберите канал для модерации",
                                "emoji": true
                            },
                            "options": channelsAsOptions,
                            "action_id": "static_select-action"
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "Канал для модерации",
                            "emoji": true
                        }
                    },
                    {
                        "block_id": "moderator_channel",
                        "type": "input",
                        "element": moderationChannel ? {
                            "type": "static_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Выберите канал модератора",
                                "emoji": true
                            },
                            "options": channelsAsOptions,
                            "action_id": "static_select-action",
                            "initial_option": {
                                "value": moderationChannel.value,
                                "text": {
                                    "type": "plain_text",
                                    "text": moderationChannel.text.text
                                }
                            }
                        } : {
                            "type": "static_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Выберите канал модератора",
                                "emoji": true
                            },
                            "options": channelsAsOptions,
                            "action_id": "static_select-action"
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "Канал модератора",
                            "emoji": true
                        }
                    },
                    {
                        "block_id": "users_without_moderation",
                        "type": "input",
                        "element": {
                            "type": "multi_users_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Выберите пользователей",
                                "emoji": true
                            },
                            "action_id": "multi_users_select-action",
                            "initial_users": usersWithoutModeration
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "Пользователи без модерации",
                            "emoji": true
                        },
                        "optional": true
                    }
                ]
            }
        })
    } catch (e) {
        console.error(e)
    }
});

app.view("settings_callback", async ({ ack, view, client, body }) => {
    function validate(sourse, target) {
        const errors = {};

        if (target.includes(sourse)) {
            errors.moderator_channel = 'Канал должен отличатся';
            return errors;
        }
        return false;
    }

    let channels = [];
    const list = await client.conversations.list({ types: 'public_channel, private_channel, im, mpim' });

    if (list.response_metadata.acceptedScopes) {
        const seclist = await client.conversations.list({ types: 'public_channel, private_channel, im, mpim', cursor: list.response_metadata.next_cursor });
        channels = [...list.channels, ...seclist.channels];
    } else {
        channels = list.channels
    }

    try {
        channelForModeration = view.state.values.channel_for_moderation['static_select-action']['selected_options'] || null;
        moderationChannel = view.state.values.moderator_channel['static_select-action']['selected_option'] || null;
        usersWithoutModeration = view.state.values['users_without_moderation']['multi_users_select-action']['selected_users'];
        const ids = channelForModeration.map(it => it.value)
        const isInChannelForModeration = ids.filter(el => !channels.some(it => it.is_member && it.id === el))
        const isInModerationChannel = channels.find(el => el.id === moderationChannel.value);

        const err = validate(moderationChannel.value, channelForModeration.map(el => el.value));

        const users = await client.users.list();
        const transformedUsers = users.members.filter(user => usersWithoutModeration.includes(user.id))
            .map(user => `<@${user.name}>`);

        if (err) {
            await ack({
                response_action: 'errors',
                errors: err
            })
        } else {
            await ack();
            if (isInChannelForModeration.length) {
                try {
                    isInChannelForModeration.forEach(async (newChannel) => {
                        await client.conversations.join({
                            channel: newChannel
                        })
                    })
                } catch (e) {
                    console.warn(e)
                }
            }
            if (!isInModerationChannel.is_member) {
                await client.conversations.join({
                    channel: moderationChannel.value
                })
            }

            if (channelForModeration && moderationChannel) {
                await client.views.publish({
                    user_id: body.user.id,
                    view: {
                        "type": "home",
                        "blocks": [
                            {
                                "type": "header",
                                "text": {
                                    "type": "plain_text",
                                    "text": "Добро пожаловать в бот-Moderator!",
                                    "emoji": true
                                }
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "plain_text",
                                    "text": 'Данный бот позволяет Вам проверять перед публикацией сообщения, которые участники пространства публикуют в открытых каналах.',
                                    "emoji": true
                                }
                            },
                            {
                                "type": "section",
                                "text": {
                                    "type": "plain_text",
                                    "text": `Каналы, сообщения в которых нужно отправлять на проверку: ${channelForModeration.map(el => `#${el.text.text}`).join(', ')}
Канал, куда отправлять сообщения на проверку перед публикацией: #${moderationChannel.text.text}
${transformedUsers?.length ? 'Пользователи без модерации: ' + transformedUsers.join(', ') : ''}`,
                                    "emoji": true
                                }
                            },
                            {
                                "type": "actions",
                                "elements": [
                                    {
                                        "type": "button",
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Настройка"
                                        },
                                        "value": `${body.user.id}`,
                                        "action_id": "moderator_action_settings"
                                    }
                                ]
                            }
                        ]
                    }
                });
            }
        }
    } catch (e) {
        console.error(e)
    }
})