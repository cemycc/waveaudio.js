export declare class Property {
    static Boolean: string;
    static Integer: string;
    static Float: string;
    static List: string;
    name: string;
    type: string;
    defaultValue: any;
    min: number;
    max: number;
    step: number;
    items: Array<string>;
    constructor(name: string, type: string, defaultValue: any, min?: any, max?: number, step?: number);
}
export declare class Effects {
    static list: {
        Filter: {
            properties: Property[];
            description: string;
        };
        Gain: {
            properties: Property[];
            description: string;
        };
        Panner: {
            properties: Property[];
            description: string;
        };
        Tremolo: {
            properties: Property[];
            description: string;
        };
        Chorus: {
            properties: Property[];
            description: string;
        };
        Phaser: {
            properties: Property[];
            description: string;
        };
        Overdrive: {
            properties: Property[];
            description: string;
        };
        Delay: {
            properties: Property[];
            description: string;
        };
        Compressor: {
            properties: Property[];
            description: string;
        };
        Bitcrusher: {
            properties: Property[];
            description: string;
        };
        MoogFilter: {
            properties: Property[];
            description: string;
        };
    };
}
