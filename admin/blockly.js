'use strict';

if (typeof goog !== 'undefined') {
    goog.provide('Blockly.JavaScript.Sendto');
    goog.require('Blockly.JavaScript');
}

Blockly.Translate =
    Blockly.Translate ||
    function (word, lang) {
        lang = lang || systemLang;
        if (Blockly.Words && Blockly.Words[word]) {
            return Blockly.Words[word][lang] || Blockly.Words[word].en;
        } else {
            return word;
        }
    };

/// --- SendTo Awtrix Light --------------------------------------------------
Blockly.Words['awtrix-light_notification'] = {
    en: 'Awtrix-light notification',
    de: 'Awtrix-light Benachrichtigung',
    ru: 'Awtrix-light уведомление',
    pt: 'Awtrix-light Notificação',
    nl: 'Awtrix-light Vertaling',
    fr: 'Awtrix-light Notification',
    it: 'Awtrix-light Notifica',
    es: 'Awtrix-light Alerta',
    pl: 'Awtrix-light notification',
    uk: 'Awtrix-light повідомлення',
    'zh-cn': 'Awtrix-light 发出通知',
};
Blockly.Words['awtrix-light_playsound'] = {
    en: 'Awtrix-light Play sound',
    de: 'Awtrix-light Sound spielen',
    ru: 'Awtrix-light Играть звук',
    pt: 'Awtrix-light Tocar som',
    nl: 'Awtrix-light Speel',
    fr: 'Awtrix-light Play sound',
    it: 'Awtrix-light Suoni suono',
    es: 'Awtrix-light Jugar sonido',
    pl: 'Awtrix-light Dźwięk',
    uk: 'Awtrix-light Грати звук',
    'zh-cn': 'Awtrix-light 声音',
};
Blockly.Words['awtrix-light_message'] = {
    en: 'Message',
    de: 'Nachricht',
    ru: 'Сообщение',
    pt: 'Mensagem',
    nl: 'Bericht',
    fr: 'Message',
    it: 'Messaggio',
    es: 'Mensaje',
    pl: 'Message',
    uk: 'Новини',
    'zh-cn': '导 言',
};
Blockly.Words['awtrix-light_color'] = {
    en: 'Color',
    de: 'Farbe',
    ru: 'Цвет',
    pt: 'Cor',
    nl: 'Color',
    fr: 'Couleur',
    it: 'Colore',
    es: 'Color',
    pl: 'Color',
    uk: 'Колір',
    'zh-cn': '科 法 律',
};
Blockly.Words['awtrix-light_sound'] = {
    en: 'Sound',
    de: 'Ton',
    ru: 'Звук',
    pt: 'Soa',
    nl: 'Sound',
    fr: 'Sound',
    it: 'Suono',
    es: 'Sonido',
    pl: 'Sound',
    uk: 'Звуковий',
    'zh-cn': '保密',
};
Blockly.Words['awtrix-light_icon'] = {
    en: 'Icon',
    de: 'Icon',
    ru: 'Икона',
    pt: 'Ícone',
    nl: 'Icon',
    fr: 'Icon',
    it: 'Icona',
    es: 'Icon',
    pl: 'Ikon',
    uk: 'Ікона',
    'zh-cn': '一. 导言',
};
Blockly.Words['awtrix-light_repeat'] = {
    en: 'Repetitions',
    de: 'Wiederholungen',
    ru: 'Повторение',
    pt: 'Repetições',
    nl: 'Herhaling',
    fr: 'Répétitions',
    it: 'Ripetizioni',
    es: 'Repeticiones',
    pl: 'Repetycja',
    uk: 'Рекорди',
    'zh-cn': '重复',
};
Blockly.Words['awtrix-light_duration'] = {
    en: 'Duration',
    de: 'Dauer',
    ru: 'Продолжительность',
    pt: 'Duração',
    nl: 'Vertaling:',
    fr: 'Durée',
    it: 'Durata',
    es: 'Duración',
    pl: 'Duracja',
    uk: 'Тривалість',
    'zh-cn': '期间',
};
Blockly.Words['awtrix-light_rainbow'] = {
    en: 'Rainbow text',
    de: 'Regenbogentext',
    ru: 'Текст радуга',
    pt: 'Texto do arco-íris',
    nl: 'Vertaling:',
    fr: 'Texte arc-en-ciel',
    it: `Testo dell'arcobaleno`,
    es: 'Texto del arco iris',
    pl: 'Rainbow text',
    uk: 'Веселий текст',
    'zh-cn': '文 件',
};
Blockly.Words['awtrix-light_stack'] = {
    en: 'Stack',
    de: 'Stapeln',
    ru: 'Стек',
    pt: 'Stack',
    nl: 'Stack',
    fr: 'Stack',
    it: 'Stack',
    es: 'Stack',
    pl: 'Stack',
    uk: 'Стейк',
    'zh-cn': '包装',
};
Blockly.Words['awtrix-light_wakeup'] = {
    en: 'Wakeup',
    de: 'Aufwecken',
    ru: 'Вакеп',
    pt: 'Acorda',
    nl: 'Wakker worden',
    fr: 'Réveille-toi',
    it: 'Sveglia',
    es: 'Despierta',
    pl: 'Wakeup',
    uk: 'Вейкап',
    'zh-cn': '瓦克鲁',
};
Blockly.Words['awtrix-light_anyInstance'] = {
    en: 'All instances',
    de: 'Alle Instanzen',
    ru: 'Все экземпляры',
    pt: 'Todas as instâncias',
    nl: 'Alle instanties',
    fr: 'Toutes les instances',
    it: 'Tutte le istanze',
    es: 'Todas las instancias',
    pl: 'Wszystkie instancje',
    uk: 'Всі екземпляри',
    'zh-cn': '所有案件',
};
Blockly.Words['awtrix-light_tooltip'] = {
    en: 'Send notification to Awtrix',
    de: 'Nachricht senden an Awtrix',
    ru: 'Отправить уведомление в Awtrix',
    pt: 'Enviar notificação para Awtrix',
    nl: 'Stuur een bericht naar Awtrix',
    fr: 'Envoyer la notification à Awtrix',
    it: 'Invia notifica a Awtrix',
    es: 'Enviar notificación a Awtrix',
    pl: 'Powiadomienie Awtrix',
    uk: 'Надіслати повідомлення на Awtrix',
    'zh-cn': '向Awtrix发出通知',
};
Blockly.Words['awtrix-light_help'] = { en: 'https://github.com/klein0r/ioBroker.awtrix-light/blob/master/docs/en/README.md', de: 'https://github.com/klein0r/ioBroker.awtrix-light/blob/master/docs/de/README.md' };

Blockly.Sendto.blocks['awtrix-light'] =
    '<block type="awtrix-light">' +
    '     <value name="INSTANCE">' +
    '     </value>' +
    '     <value name="MESSAGE">' +
    '         <shadow type="text">' +
    '             <field name="TEXT">haus-automatisierung.com</field>' +
    '         </shadow>' +
    '     </value>' +
    '     <value name="COLOR">' +
    '         <shadow type="colour_picker">' +
    '             <field name="COLOUR">#ffffff</field>' +
    '         </shadow>' +
    '     </value>' +
    '     <value name="SOUND">' +
    '         <shadow type="logic_null"></shadow>' +
    '     </value>' +
    '     <value name="ICON">' +
    '         <shadow type="logic_null"></shadow>' +
    '     </value>' +
    '     <value name="REPEAT">' +
    '         <shadow type="math_number">' +
    '             <field name="NUM">1</field>' +
    '         </shadow>' +
    '     </value>' +
    '     <value name="DURATION">' +
    '         <shadow type="math_number">' +
    '             <field name="NUM">0</field>' +
    '         </shadow>' +
    '     </value>' +
    '     <value name="RAINBOW">' +
    '     </value>' +
    '     <value name="STACK">' +
    '     </value>' +
    '     <value name="WAKEUP">' +
    '     </value>' +
    '</block>';

Blockly.Blocks['awtrix-light'] = {
    init: function () {
        const options = [];

        if (typeof main !== 'undefined' && main.instances) {
            for (let i = 0; i < main.instances.length; i++) {
                const m = main.instances[i].match(/^system.adapter.awtrix-light.(\d+)$/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    options.push(['awtrix-light.' + n, '.' + n]);
                }
            }
        }

        if (!options.length) {
            for (let k = 0; k <= 4; k++) {
                options.push(['awtrix-light.' + k, '.' + k]);
            }
        }

        options.unshift([Blockly.Translate('awtrix-light_anyInstance'), '']);

        this.appendDummyInput('INSTANCE').appendField(Blockly.Translate('awtrix-light_notification')).appendField(new Blockly.FieldDropdown(options), 'INSTANCE');
        this.appendValueInput('MESSAGE').appendField(Blockly.Translate('awtrix-light_message'));
        this.appendValueInput('COLOR').appendField(Blockly.Translate('awtrix-light_color'));
        this.appendValueInput('SOUND').appendField(Blockly.Translate('awtrix-light_sound'));
        this.appendValueInput('ICON').appendField(Blockly.Translate('awtrix-light_icon'));
        this.appendValueInput('REPEAT').appendField(Blockly.Translate('awtrix-light_repeat'));
        this.appendValueInput('DURATION').appendField(Blockly.Translate('awtrix-light_duration'));
        this.appendDummyInput('RAINBOW').appendField(Blockly.Translate('awtrix-light_rainbow')).appendField(new Blockly.FieldCheckbox('FALSE'), 'RAINBOW');
        this.appendDummyInput('STACK_INPUT').appendField(Blockly.Translate('awtrix-light_stack')).appendField(new Blockly.FieldCheckbox('TRUE'), 'STACK');
        this.appendDummyInput('WAKEUP_INPUT').appendField(Blockly.Translate('awtrix-light_wakeup')).appendField(new Blockly.FieldCheckbox('TRUE'), 'WAKEUP');

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('awtrix-light_tooltip'));
        this.setHelpUrl(Blockly.Translate('awtrix-light_help'));
    },
};

Blockly.JavaScript['awtrix-light'] = function (block) {
    const message = Blockly.JavaScript.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC);
    const color = Blockly.JavaScript.valueToCode(block, 'COLOR', Blockly.JavaScript.ORDER_ATOMIC);
    const sound = Blockly.JavaScript.valueToCode(block, 'SOUND', Blockly.JavaScript.ORDER_ATOMIC);
    const icon = Blockly.JavaScript.valueToCode(block, 'ICON', Blockly.JavaScript.ORDER_ATOMIC);
    const repeat = Blockly.JavaScript.valueToCode(block, 'REPEAT', Blockly.JavaScript.ORDER_ATOMIC);
    const duration = Blockly.JavaScript.valueToCode(block, 'DURATION', Blockly.JavaScript.ORDER_ATOMIC);

    let rainbow = block.getFieldValue('RAINBOW');
    rainbow = rainbow === 'TRUE' || rainbow === 'true' || rainbow === true;

    let stack = block.getFieldValue('STACK');
    stack = stack === 'TRUE' || stack === 'true' || stack === true;

    let wakeup = block.getFieldValue('WAKEUP');
    wakeup = wakeup === 'TRUE' || wakeup === 'true' || wakeup === true;

    const objText = [];
    message && objText.push('text: ' + message);
    color && !rainbow && objText.push('color: String(' + color + ').toUpperCase()');
    sound && objText.push('sound: ' + sound);
    icon && objText.push('icon: ' + icon);
    repeat && objText.push('repeat: parseInt(' + repeat + ')');
    duration && objText.push('duration: parseInt(' + duration + ')');
    objText.push('rainbow: ' + rainbow);
    objText.push('stack: ' + stack);
    objText.push('wakeup: ' + wakeup);

    return `sendTo('awtrix-light${block.getFieldValue('INSTANCE')}', 'notification', { ${objText.join(', ')} });`;
};

Blockly.Sendto.blocks['awtrix-light_playsound'] =
    '<block type="awtrix-light_playsound">' +
    '     <value name="INSTANCE">' +
    '     </value>' +
    '     <value name="SOUND">' +
    '         <shadow type="text">' +
    '             <field name="TEXT">...</field>' +
    '         </shadow>' +
    '     </value>' +
    '</block>';

Blockly.Blocks['awtrix-light_playsound'] = {
    init: function () {
        const options = [];

        if (typeof main !== 'undefined' && main.instances) {
            for (let i = 0; i < main.instances.length; i++) {
                const m = main.instances[i].match(/^system.adapter.awtrix-light.(\d+)$/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    options.push(['awtrix-light.' + n, '.' + n]);
                }
            }
        }

        if (!options.length) {
            for (let k = 0; k <= 4; k++) {
                options.push(['awtrix-light.' + k, '.' + k]);
            }
        }

        options.unshift([Blockly.Translate('awtrix-light_anyInstance'), '']);

        this.appendDummyInput('INSTANCE').appendField(Blockly.Translate('awtrix-light_playsound')).appendField(new Blockly.FieldDropdown(options), 'INSTANCE');
        this.appendValueInput('SOUND').appendField(Blockly.Translate('awtrix-light_sound'));

        this.setInputsInline(false);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);

        this.setColour(Blockly.Sendto.HUE);
        this.setTooltip(Blockly.Translate('awtrix-light_tooltip'));
        this.setHelpUrl(Blockly.Translate('awtrix-light_help'));
    },
};

Blockly.JavaScript['awtrix-light_playsound'] = function (block) {
    const sound = Blockly.JavaScript.valueToCode(block, 'SOUND', Blockly.JavaScript.ORDER_ATOMIC);

    const objText = [];
    sound && objText.push('sound: ' + sound);

    return `sendTo('awtrix-light${block.getFieldValue('INSTANCE')}', 'sound', { ${objText.join(', ')} });`;
};
