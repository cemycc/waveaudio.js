export declare class Property {
    static Boolean: string;
    static Integer: string;
    static Float: string;
    name: string;
    type: string;
    defaultValue: number;
    min: number;
    max: number;
    step: number;
    constructor(name: string, type: string, defaultValue: number, min?: number, max?: number, step?: number);
}
export declare class Effects {
    static list: {
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
