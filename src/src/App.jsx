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
