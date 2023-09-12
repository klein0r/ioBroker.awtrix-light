// This file extends the AdapterConfig type from "@types/iobroker"

export type DefaultApp = {
    name: string;
    position: number;
};

export type CustomApp = DefaultApp & {
    icon: string;
    duration: number;
    repeat: number;
    text: string;
    objId: string;
    decimals: number;
    rainbow: boolean;
    textColor: string;
    noScroll: boolean;
    scrollSpeed: number;
    useBackgroundEffect: boolean;
    backgroundColor: string;
    backgroundEffect: string;

    thresholdLtActive: boolean;
    thresholdLtValue: number;
    thresholdLtIcon: string;
    thresholdLtTextColor: string;
    thresholdLtBackgroundColor: string;

    thresholdGtActive: boolean;
    thresholdGtValue: number;
    thresholdGtIcon: string;
    thresholdGtTextColor: string;
    thresholdGtBackgroundColor: string;
};

export type HistoryApp = DefaultApp & {
    icon: string;
    duration: number;
    repeat: number;
    sourceInstance: string;
    objId: string;
    lineColor: string;
    backgroundColor: string;
};

export type ExpertApp = DefaultApp & {
    name: string;
};

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            awtrixIp: string;
            userName: string;
            userPassword: string;
            downloadScreenContent: boolean;
            downloadScreenContentInterval: number;
            foreignSettingsInstance: string;
            customApps: Array<CustomApp>;
            ignoreNewValueForAppInTimeRange: number;
            historyApps: Array<HistoryApp>;
            historyAppsBackgroundColor: string;
            historyAppsRefreshInterval: number;
            autoDeleteForeignApps: boolean;
            removeAppsOnStop: boolean;
            httpTimeout: number;
            numberFormat: string;
            customPositions: boolean;
            expertApps: Array<ExpertApp>;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
