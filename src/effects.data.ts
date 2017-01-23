// export enum Effects {
//     Delay,
//     Filter,
//     Chorus,
//     Phaser,
//     Overdrive,
//     Compressor,
//     Panner,
//     Gain,
//     Tremolo,
//     WahWah,
//     Bitcrusher,
//     MoogFilter,
//     PingPongDelay
// }

export class Property {
    public static Boolean = 'boolean';
    public static Integer = 'integer';
    public static Float = 'float';
    public name: string;
    public type: string;
    public defaultValue: number;
    public min: number;
    public max: number;
    public step: number;

    constructor(name: string, type: string, defaultValue: number, min: number = 0, max: number = null, step: number = 1) {
        this.name = name;
        this.type = type;
        this.defaultValue = defaultValue;
        this.min = min;
        this.max = max;
        this.step = step;
    }
}

export class Effects {
    public static list = {
        Gain: {
            properties: [
                new Property('gain', Property.Float, 0.7, 0, 30, 0.1),
            ],
            description: ''
        },
        Panner: {
            properties: [
                new Property('pan', Property.Float, 0, -1, 1, 0.1),
            ],
            description: ''
        },
        Tremolo: {
            properties: [
                new Property('intensity', Property.Float, 0.3, 0, 1, 0.01),
                new Property('rate', Property.Float, 4, 0.001, 8, 0.001),
                new Property('stereoPhase', Property.Integer, 0, 0, 180, 1),
                new Property('bypass', Property.Boolean, 0)
            ],
            description: ''
        },
        Chorus: {
            properties: [
                new Property('rate', Property.Float, 1.5, 0.01, 8, 0.01),
                new Property('delay', Property.Float, 0.0045, 0, 1, 0.0001),
                new Property('feedback', Property.Float, 0.45, 0, 0.8, 0.01),
                new Property('bypass', Property.Boolean, 0)
            ],
            description: ''
        },
        Phaser: {
            properties: [
                new Property('rate', Property.Float, 1.2, 0.01, 8, 0.01),
                new Property('depth', Property.Float, 0.3, 0, 1, 0.01),
                new Property('feedback', Property.Float, 0.2, 0, 0.8, 0.01),
                new Property('stereoPhase', Property.Float, 30, 0, 180, 1),
                new Property('baseModulationFrequency', Property.Integer, 700, 500, 1500, 1),
                new Property('bypass', Property.Boolean, 0)
            ],
            description: ''
        },
        Overdrive: {
            properties: [
                new Property('outputGain', Property.Float, 0.5, 0, 1, 0.01),
                new Property('drive', Property.Float, 0.7, 0, 1, 0.01),
                new Property('curveAmount', Property.Float, 0.8, 0, 1, 0.01),
                new Property('algorithmIndex', Property.Integer, 0, 0, 5, 1),
                new Property('bypass', Property.Boolean, 0)
            ],
            description: ''
        },
        Delay: {
            properties: [
                new Property('delayTime', Property.Integer, 150, 1, 10000),
                new Property('wetLevel', Property.Float, 0.25, 0, 1, 0.01),
                new Property('dryLevel', Property.Float, 1, 0, 1, 0.01),
                new Property('cutoff', Property.Integer, 2000, 20, 22050),
                new Property('feedback', Property.Float, 0.45, 0, 0.8, 0.01),
                new Property('bypass', Property.Boolean, 0)
            ],
            description: ''
        },
        Compressor: {
            properties: [
                new Property('threshold', Property.Integer, -1, -100, 0, 1),
                new Property('makeupGain', Property.Integer, 1, 0, 5, 1),
                new Property('attack', Property.Integer, 1, 0, 1000, 1),
                new Property('release', Property.Integer, 0, 0, 3000, 1),
                new Property('ratio', Property.Integer, 4, 1, 20, 1),
                new Property('knee', Property.Integer, 5, 0, 40, 1),
                new Property('automakeup', Property.Boolean, 1),
                new Property('bypass', Property.Boolean, 0)
            ],
            description: ''
        },
        Bitcrusher: {
            properties: [
                new Property('bits', Property.Integer, 4, 1, 16, 1),
                new Property('normfreq', Property.Float, 0.1, 0, 1, 0.1),
                new Property('bufferSize', Property.Integer, 4096, 256, 16384, 2)
            ],
            description: ''
        },
        MoogFilter: {
            properties: [
                new Property('cutoff', Property.Float, 0.065, 0, 1, 0.001),
                new Property('resonance', Property.Float, 3.5, 0, 4, 0.1),
                new Property('bufferSize', Property.Integer, 4096, 256, 16384, 2)
            ],
            description: ''
        }
    };
}
