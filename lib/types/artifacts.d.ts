export interface ArtifactRecord {
    readonly id: string;
    readonly kind: 'decision' | 'ticket' | 'lane' | 'packet' | 'review' | 'spec' | 'export' | 'acceptance';
    readonly mediaType: string;
    readonly sha256: string;
    readonly size: number;
    readonly relativePath: string;
    readonly createdAt: number;
}
export interface ArtifactWrite {
    readonly kind: ArtifactRecord['kind'];
    readonly mediaType: string;
    readonly bytes: Uint8Array;
}
/** Content-addressed store owned by one plugin installation. */
export declare class ArtifactStore {
    private readonly maxBytes;
    readonly root: string;
    constructor(root: string, maxBytes: number);
    /** Write bytes atomically and return immutable metadata. */
    put(input: ArtifactWrite): Promise<ArtifactRecord>;
    /** Read one exact artifact after validating that its path stays owned. */
    read(record: Pick<ArtifactRecord, 'relativePath' | 'sha256'>): Promise<Buffer>;
    private resolveOwned;
}
