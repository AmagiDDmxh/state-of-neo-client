import { Component, OnInit } from '@angular/core';
import { BlockService, TxService, AddressService, AssetService } from 'src/core/services/data';
import { UnitOfTime, AssetType } from '../../../models';

@Component({
    selector: `app-footer-stats`,
    templateUrl: './footer-stats.component.html',
    styleUrls: ['./footer-stats.component.css']
})
export class FooterStatsComponent implements OnInit {
    // Block
    latestBlock: number;
    avgSize: number;
    avgTxCount: number;
    avgTime: number;

    // TX
    totalTx: number;
    claimedGas: number;
    avgPerSecond: number;
    avgPerDay: number;

    // Addresses
    totalAddressCount: number;
    lastActiveAddresses: number;
    addrCreatedLastDay: number;
    addrCreatedLastMonth: number;

    // Assets
    totalAssetCount: number;
    neoAndGasTxCount: number;
    nep5Assets = -1;
    nep5AssetTxCount = -1;

    constructor(private blockService: BlockService,
        private txService: TxService,
        private addrService: AddressService,
        private assetService: AssetService) { }

    ngOnInit(): void {
        this.subscribeToEvents();

        // Blocks
        this.blockService.getAverageSize()
            .subscribe((x) => { this.avgSize = x.json() as number; });
        this.blockService.getAverageTime()
            .subscribe((x) => { this.avgTime = x.json() as number; });
        this.blockService.getAverageTxCount()
            .subscribe((x) => { this.avgTxCount = x.json() as number; });

        // Txs
        this.txService.getTotalGasClaimed()
            .subscribe((x) => { this.claimedGas = x.json() as number; });
        this.txService.total()
            .subscribe((x) => { this.totalTx = x.json() as number; });
        this.txService.averagePer(UnitOfTime.Second)
            .subscribe((x) => { this.avgPerSecond = x.json() as number; });
        this.txService.averagePer(UnitOfTime.Day)
            .subscribe((x) => { this.avgPerDay = x.json() as number; });

        // Addresses
        this.addrService.getCreated()
            .subscribe(x => this.totalAddressCount = x.json() as number);
        this.addrService.getActive()
             .subscribe(x => { this.lastActiveAddresses = x.json() as number; });
        this.addrService.getCreatedLast(UnitOfTime.Day)
            .subscribe(x => { this.addrCreatedLastDay = x.json() as number; });
        this.addrService.getCreatedLast(UnitOfTime.Month)
            .subscribe(x => { this.addrCreatedLastMonth = x.json() as number; });

        // Assets
        this.assetService.getAssetCount([])
            .subscribe(x => { this.totalAssetCount = x.json() as number; });
        this.assetService.getAssetTxCount([AssetType.GAS, AssetType.NEO])
            .subscribe(x => { this.neoAndGasTxCount = x.json() as number; });
        this.assetService.getAssetCount([AssetType.NEP5])
            .subscribe(x => {
                this.nep5Assets = x.json() as number;
            });
        this.assetService.getAssetTxCount([AssetType.NEP5])
            .subscribe(x => { this.nep5AssetTxCount = x.json() as number; });
    }

    private subscribeToEvents() {
        this.blockService.bestBlockChanged.subscribe((x: number) => {
            this.latestBlock = x;
        });
    }
}