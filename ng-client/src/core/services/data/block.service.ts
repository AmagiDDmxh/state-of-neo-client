import { Injectable, EventEmitter } from '@angular/core';

import { NodeService } from './node.service';

@Injectable({
    providedIn: 'root'
})
export class BlockService {
    public bestBlock = 0;
    public bestBlockChanged = new EventEmitter<number>();

    constructor(private _nodeService: NodeService) {
        this.subscribeToEvents();
    }

    private subscribeToEvents(): void {
        this._nodeService.nodeBlockInfo.subscribe((x: number) => {
            if (this.bestBlock < x) {
                this.bestBlock = x;
                this.bestBlockChanged.emit(this.bestBlock);
            }
        });
    }
}