export class BaseTxModel {
    hash: string;
    size: number;
    type: TxTypeEnum;
    timestamp: number;
    finalizedAt: Date;
}

export class TxDetailsModel extends BaseTxModel {
    networkFee: number;
    systemFee: number;
    version: number;
    blockHash: string;
    blockHeight: number;
}

export enum TxTypeEnum {
    MinerTransaction = 0,
    IssueTransaction = 1,
    ClaimTransaction = 2,
    EnrollmentTransaction = 32,
    RegisterTransaction = 64,
    ContractTransaction = 128,
    StateTransaction = 144,
    PublishTransaction = 208,
    InvocationTransaction = 209
}