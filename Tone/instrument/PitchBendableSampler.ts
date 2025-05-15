import { Sampler, SamplerOptions } from "./Sampler.js";
import { MidiNote } from "../core/type/Units.js";
import { ToneBufferSource } from "../source/buffer/ToneBufferSource.js";
import { Cents } from "../core/type/Units.js";

/**
 * An extended version of Tone.Sampler that supports pitch bending
 * This class modifies the playback rate of samples in response to pitch bend messages
 * @category Instrument
 */
export class PitchBendableSampler extends Sampler {
    /**
     * Current pitch bend value between -1 and 1
     */
    private _pitchBend: number = 0;

    /**
     * Pitch bend range in semitones (default: 2)
     */
    private _pitchBendRange: number = 2;

    /**
     * The detuning of the oscillator in cents
     */
    detune: Cents;

    /**
     * @param samples An object of samples mapping either Midi Note Numbers or
     *          Scientific Pitch Notation to the url of that sample.
     * @param onload The callback to invoke when all of the samples are loaded.
     * @param baseUrl The root URL of all of the samples, which is prepended to all the URLs.
     */
    constructor(samples?: any, onload?: () => void, baseUrl?: string);
    /**
     * @param samples An object of samples mapping either Midi Note Numbers or
     *          Scientific Pitch Notation to the url of that sample.
     * @param options The remaining options associated with the sampler
     */
    constructor(
        samples?: any,
        options?: Partial<Omit<SamplerOptions, "urls">>
    );
    constructor(options?: Partial<SamplerOptions>);
    constructor() {
        // @ts-ignore
        super(...arguments);
        this.detune = 0;
    }

    /**
     * Set the pitch bend value
     * @param value - Pitch bend value between -1 and 1
     */
    setPitchBend(value: number): this {
        // Clamp value between -1 and 1
        this._pitchBend = Math.max(-1, Math.min(1, value));
        
        // Calculate cents based on pitch bend range (typical range is 2 semitones or 200 cents)
        const cents = this._pitchBend * this._pitchBendRange * 100;
        
        // Convert cents to playback rate factor
        const playbackRateFactor = Math.pow(2, cents / 1200);
        
        // Apply to all active voices
        this._applyPitchBendToVoices(playbackRateFactor);
        
        // Update global detune for new voices
        this.detune = cents;
        
        return this;
    }
    
    /**
     * Set the range of the pitch bend in semitones
     * @param semitones - Pitch bend range in semitones (typically 2, 12, or 24)
     */
    setPitchBendRange(semitones: number): this {
        this._pitchBendRange = semitones;
        // Re-apply current pitch bend with new range
        this.setPitchBend(this._pitchBend);
        return this;
    }
    
    /**
     * Apply pitch bend to all active voices
     * @private
     * @param playbackRateFactor - Playback rate multiplier
     */
    private _applyPitchBendToVoices(playbackRateFactor: number): void {
        // Use type assertion to access the private property
        const activeSources = (this as any)._activeSources as Map<MidiNote, ToneBufferSource[]>;
        
        activeSources.forEach((sources: ToneBufferSource[]) => {
            sources.forEach((source: ToneBufferSource) => {
                if (source.playbackRate) {
                    try {
                        // Apply the pitch bend to the playback rate while preserving
                        // any pitch adjustments from the sample mapping
                        const baseRate = (source as any)._playbackRate || 1;
                        source.playbackRate.value = baseRate * playbackRateFactor;
                    } catch (e) {
                        console.warn("Error applying pitch bend to sample source:", e);
                    }
                }
            });
        });
    }
    
    /**
     * Override the triggerAttack method to apply pitch bend to new voices
     */
    triggerAttack(notes: any, time?: any, velocity: number = 1): this {
        // Call the original triggerAttack method
        super.triggerAttack(notes, time, velocity);
        
        // Apply current pitch bend to the new voices if necessary
        if (this._pitchBend !== 0) {
            const cents = this._pitchBend * this._pitchBendRange * 100;
            const playbackRateFactor = Math.pow(2, cents / 1200);
            this._applyPitchBendToVoices(playbackRateFactor);
        }
        
        return this;
    }
} 