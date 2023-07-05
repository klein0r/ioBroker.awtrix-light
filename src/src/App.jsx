// this file used only for simulation and not used in end build

import React from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import withStyles from '@mui/styles/withStyles';

import GenericApp from '@iobroker/adapter-react-v5/GenericApp';
import I18n from '@iobroker/adapter-react-v5/i18n';
import Loader from '@iobroker/adapter-react-v5/Components/Loader';

import AwtrixAppComponent from './AwtrixAppComponent';

const styles = theme => ({
    app: {
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        height: '100%',
    },
    item: {
        padding: 50,
        width: 400
    }
});

class App extends GenericApp {
    constructor(props) {
        const extendedProps = { ...props };
        super(props, extendedProps);

        this.state = {
            data: { myCustomAttribute: 'red' },
            theme: this.createTheme(),
        };
        /*
        const translations = {
            en: require('./i18n/en.js'),
            de: require('./i18n/de.js'),
            ru: require('./i18n/ru.js'),
            pt: require('./i18n/pt.js'),
            nl: require('./i18n/nl.js'),
            fr: require('./i18n/fr.js'),
            it: require('./i18n/it.js'),
            es: require('./i18n/es.js'),
            pl: require('./i18n/pl.js'),
            uk: require('./i18n/uk.js'),
            'zh-cn': require('./i18n/zh-cn').json,
        };

        I18n.setTranslations(translations);
        */
        I18n.setLanguage((navigator.language || navigator.userLanguage || 'en').substring(0, 2).toLowerCase());
    }

    render() {
        if (!this.state.loaded) {
            return <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <Loader theme={this.state.themeType} />
                </ThemeProvider>
            </StyledEngineProvider>;
        }

        return <StyledEngineProvider injectFirst>
            <ThemeProvider theme={this.state.theme}>
                <div className={this.props.classes.app}>
                    <div className={this.props.classes.item}>
                        <AwtrixAppComponent
                            socket={this.socket}
                            themeType={this.state.themeType}
                            themeName={this.state.themeName}
                            attr='historyApps'
                            data={this.state.data}
                            onError={() => {}}
                            instance={0}
                            schema={{
                                name: 'ConfigCustomAwtrixSet/Components/AwtrixAppComponent',
                                type: 'custom',
                                "items": [
                                  {
                                      "type": "text",
                                      "attr": "name",
                                      "width": "20%",
                                      "title": {
                                          "en": "Name",
                                          "de": "Name",
                                          "ru": "Имя",
                                          "pt": "Nome",
                                          "nl": "Naam",
                                          "fr": "Nom",
                                          "it": "Nome",
                                          "es": "Nombre",
                                          "pl": "Nazwa",
                                          "uk": "Ім'я",
                                          "zh-cn": "姓名"
                                      },
                                      "filter": true,
                                      "sort": true,
                                      "default": "",
                                      "validator": "/^([a-z]{1,})$/.test(data.name) && !['time', 'eyes', 'date', 'temp', 'hum', 'bat'].includes(data.name) && globalData.customApps.concat(globalData.historyApps).filter(app => app.name === data.name).length === 1",
                                      "validatorErrorText": "Just lower case letters (a-z)",
                                      "validatorNoSaveOnError": true
                                  },
                                  {
                                      "type": "text",
                                      "attr": "icon",
                                      "width": "20%",
                                      "title": {
                                          "en": "Icon",
                                          "de": "Symbol",
                                          "ru": "Значок",
                                          "pt": "Ícone",
                                          "nl": "Icoon",
                                          "fr": "Icône",
                                          "it": "Icona",
                                          "es": "Icono",
                                          "pl": "Ikona",
                                          "zh-cn": "图标"
                                      },
                                      "filter": false,
                                      "sort": false
                                  },
                                  {
                                      "type": "text",
                                      "attr": "text",
                                      "width": "25%",
                                      "title": {
                                          "en": "Text",
                                          "de": "Text",
                                          "ru": "Текст",
                                          "pt": "Texto",
                                          "nl": "Tekst",
                                          "fr": "Texte",
                                          "it": "Testo",
                                          "es": "Texto",
                                          "pl": "Tekst",
                                          "zh-cn": "文本"
                                      },
                                      "filter": false,
                                      "sort": false,
                                      "default": "%s %u"
                                  },
                                  {
                                      "type": "objectId",
                                      "attr": "objId",
                                      "width": "25%",
                                      "title": {
                                          "en": "Object",
                                          "de": "Obiekt",
                                          "ru": "Объект",
                                          "pt": "Objeto",
                                          "nl": "Object",
                                          "fr": "Objet",
                                          "it": "Oggetto",
                                          "es": "Objeto",
                                          "pl": "Obiekt",
                                          "uk": "Об'єкт",
                                          "zh-cn": "目 录"
                                      },
                                      "filter": false,
                                      "sort": false,
                                      "default": ""
                                  },
                                  {
                                      "type": "number",
                                      "attr": "decimals",
                                      "width": "15%",
                                      "title": {
                                          "en": "Decimals",
                                          "de": "Dezimalstellen",
                                          "ru": "Денимации",
                                          "pt": "Decimais",
                                          "nl": "Decimale",
                                          "fr": "Décimales",
                                          "it": "Decimali",
                                          "es": "Decimales",
                                          "pl": "Dekret",
                                          "uk": "Декілька",
                                          "zh-cn": "青少年"
                                      },
                                      "filter": false,
                                      "sort": false,
                                      "default": 3
                                  },
                                  {
                                      "type": "number",
                                      "attr": "duration",
                                      "width": "15%",
                                      "title": {
                                          "en": "Duration (sec)",
                                          "de": "Dauer (Sek.)",
                                          "ru": "Продолжительность (сек)",
                                          "pt": "Duração (s)",
                                          "nl": "Duur (sec)",
                                          "fr": "Durée (sec)",
                                          "it": "Durata (sec)",
                                          "es": "Duración (seg)",
                                          "pl": "Czas trwania (s)",
                                          "zh-cn": "持续时间（秒）"
                                      },
                                      "filter": false,
                                      "sort": false,
                                      "default": 5
                                  }
                              ]
                            }}
                            onChange={data => {
                                this.setState({ data });
                            }}
                        />
                    </div>
                </div>
            </ThemeProvider>
        </StyledEngineProvider>;
    }
}

export default withStyles(styles)(App);
