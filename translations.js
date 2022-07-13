const translations = {
    'Добро пожаловать в бот-Moderator!': 'Welcome to the Moderator bot!',
    'Каналы, сообщения в которых нужно отправлять на проверку': 'Messages from these channels will be sent for verification',
    'Канал, куда отправлять сообщения на проверку перед публикацией': 'The channel where messages will be sent for verification before publication',
    'Пользователи без модерации': 'Users without moderation',
    'нету': 'no',
    'Настройка': 'Settings',
    'Подтвердить': 'Submit',
    'Отмена': 'Cancel',
    'Выберите канал для модерации': 'Select a channel for moderation',
    'Канал для модерации': 'Channel for moderation',
    'Выберите канал модератора': 'Select moderator channel',
    'Канал модератора': 'Moderator channel',
    'Выберите пользователей': 'Select users',
    'Данный бот позволяет Вам проверять перед публикацией сообщения, которые участники пространства публикуют в открытых каналах': 'This bot allows you to check before publishing messages that workspace members publish in open channels',
    'Moderator - настройка': 'Moderator - settings',
    'Канал должен отличатся': 'The channel must be different',
    'Ваше сообщение будет опубликовано после проверки модератором': 'Your message will be published after being moderated',
    'Новое сообщение от': 'New message from',
    'Опубликовать сообщение в канале': 'Post a message to a channel',
    'Отклонить': 'Reject'
}

export function t(lang, default_str) {
    switch(lang) {
        case 'en-GB': return translations[default_str] || default_str;
        default: return default_str
    }
}
