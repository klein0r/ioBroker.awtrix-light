import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import Utils from '@iobroker/adapter-react-v5/Components/Utils';
import App from './App'
import theme from './theme';

window.adapterName = 'awtrix-light';
let themeName = Utils.getThemeName();

function build() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <StyledEngineProvider injectFirst>
              <ThemeProvider theme={theme(themeName)}>
                  <App
                      socket={{port: 8081}}
                      onThemeChange={(_theme) => {
                          themeName = _theme;
                          build();
                      }}
                  />
              </ThemeProvider>
          </StyledEngineProvider>
    </React.StrictMode>
  );
}

build();