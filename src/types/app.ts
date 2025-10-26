export interface TranscriptEntry {
    source: 'user' | 'agent';
    text: string;
    isFinal: boolean;
}
