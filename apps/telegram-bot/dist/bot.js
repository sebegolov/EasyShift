"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBot = createBot;
const telegraf_1 = require("telegraf");
const api_client_1 = require("./api-client");
const messages_1 = require("./messages");
function buildMiniAppUrl(miniAppUrl, extraQuery) {
    if (!miniAppUrl) {
        return '';
    }
    // Если в MINI_APP_URL из .env уже "прилип" screen=account — не тащим это при обычном открытии.
    // screen=account добавляется обратно только когда явно запрошено в extraQuery (команда /account).
    const stripSettingsAccountFromBase = (urlStr) => {
        try {
            const u = new URL(urlStr);
            if (u.searchParams.get('screen') === 'account') {
                u.searchParams.delete('screen');
                u.searchParams.delete('from');
            }
            return u.toString();
        }
        catch {
            return urlStr.replace(/([?&])screen=account(&|$)/, '$1').replace(/([?&])from=account(&|$)/, '$1');
        }
    };
    const cleanBase = stripSettingsAccountFromBase(miniAppUrl);
    const hasQuery = cleanBase.includes('?');
    const base = `${cleanBase}${hasQuery ? '&' : '?'}v=20260318`;
    if (!extraQuery) {
        return base;
    }
    return `${base}&${extraQuery}`;
}
function createBot(token, apiBaseUrl, miniAppUrl) {
    const bot = new telegraf_1.Telegraf(token);
    const apiClient = new api_client_1.ApiClient(apiBaseUrl);
    void syncTelegramInterface(bot, miniAppUrl);
    bot.start(async (ctx) => {
        await ensureChatMenuButton(bot, ctx.chat?.id, miniAppUrl);
        await apiClient.startTelegram({
            telegramId: String(ctx.from?.id ?? ''),
            fullName: [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' '),
        });
        await ctx.reply(messages_1.messages.welcome);
        await ctx.reply(messages_1.messages.chooseRole, buildMiniAppKeyboard(miniAppUrl));
        await ctx.reply(messages_1.messages.account, buildAccountKeyboard(miniAppUrl));
    });
    registerOwnerCommands(bot, apiClient, miniAppUrl);
    registerWorkerCommands(bot, apiClient, miniAppUrl);
    registerCommonCommands(bot, miniAppUrl);
    return bot;
}
function registerOwnerCommands(bot, apiClient, miniAppUrl) {
    bot.command('owner_menu', async (ctx) => {
        await ctx.reply(messages_1.messages.ownerMenu, buildMiniAppKeyboard(miniAppUrl));
    });
    bot.command('add_pvz', async (ctx) => {
        await ctx.reply(messages_1.messages.createPvz);
    });
    bot.command('create_shift', async (ctx) => {
        await ctx.reply(messages_1.messages.createShift);
    });
    bot.command('demo_owner_profile', async (ctx) => {
        const result = await apiClient.createOwnerProfile({
            userId: 'demo_owner_user',
            contactName: ctx.from?.first_name ?? 'Owner',
            contactPhone: '+70000000000',
            companyName: 'Demo PVZ',
        });
        await ctx.reply(`Профиль владельца создан: ${JSON.stringify(result)}`);
    });
}
function registerWorkerCommands(bot, apiClient, miniAppUrl) {
    bot.command('worker_menu', async (ctx) => {
        await ctx.reply(messages_1.messages.workerMenu, buildMiniAppKeyboard(miniAppUrl));
    });
    bot.command('set_zone', async (ctx) => {
        await ctx.reply(messages_1.messages.setZone);
    });
    bot.command('apply_shift', async (ctx) => {
        await ctx.reply(messages_1.messages.apply);
    });
    bot.command('demo_worker_profile', async (ctx) => {
        const result = await apiClient.createWorkerProfile({
            userId: 'demo_worker_user',
            city: 'Moscow',
            expectedRate: 3500,
            experienceSummary: 'Работал в ПВЗ и на выдаче заказов.',
        });
        await ctx.reply(`Профиль работника создан: ${JSON.stringify(result)}`);
    });
}
function registerCommonCommands(bot, miniAppUrl) {
    bot.command('account', async (ctx) => {
        await ctx.reply(messages_1.messages.account, buildAccountKeyboard(miniAppUrl));
    });
    bot.command('open_app', async (ctx) => {
        await ctx.reply(messages_1.messages.chooseRole, buildMiniAppKeyboard(miniAppUrl));
    });
}
function buildMiniAppKeyboard(miniAppUrl) {
    if (!miniAppUrl) {
        return undefined;
    }
    return telegraf_1.Markup.inlineKeyboard([
        [
            telegraf_1.Markup.button.webApp('Я работник', buildMiniAppUrl(miniAppUrl, 'role=worker')),
            telegraf_1.Markup.button.webApp('Я работодатель', buildMiniAppUrl(miniAppUrl, 'role=owner')),
        ],
    ]);
}
function buildAccountKeyboard(miniAppUrl) {
    if (!miniAppUrl) {
        return undefined;
    }
    return telegraf_1.Markup.inlineKeyboard([
        [
            telegraf_1.Markup.button.webApp(messages_1.messages.openMiniApp, buildMiniAppUrl(miniAppUrl, 'openAccount=1&from=account')),
        ],
    ]);
}
async function syncTelegramInterface(bot, miniAppUrl) {
    try {
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Открыть EasyShift' },
            { command: 'open_app', description: 'Открыть Mini App' },
            { command: 'account', description: 'Настройки аккаунта' },
            { command: 'owner_menu', description: 'Меню работодателя' },
            { command: 'worker_menu', description: 'Меню работника' },
            { command: 'add_pvz', description: 'Добавить ПВЗ' },
            { command: 'create_shift', description: 'Создать смену' },
            { command: 'set_zone', description: 'Настроить зону работы' },
            { command: 'apply_shift', description: 'Откликнуться на смену' },
        ]);
        if (miniAppUrl) {
            await ensureChatMenuButton(bot, undefined, miniAppUrl);
        }
    }
    catch (error) {
        console.error('Failed to sync Telegram interface', error);
    }
}
async function ensureChatMenuButton(bot, chatId, miniAppUrl) {
    if (!miniAppUrl) {
        return;
    }
    const payload = {
        menu_button: {
            type: 'web_app',
            text: messages_1.messages.openMiniApp,
            web_app: { url: buildMiniAppUrl(miniAppUrl) },
        },
    };
    if (chatId) {
        payload.chat_id = chatId;
    }
    await bot.telegram.callApi('setChatMenuButton', payload);
}
