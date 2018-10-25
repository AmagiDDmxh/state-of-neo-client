import { Injectable, EventEmitter } from '@angular/core';
import { Http, Response, RequestOptions, Headers } from '@angular/http';

import { NodesSignalRService } from '../signal-r/nodes-signal-r.service';
import { NodeRpcService } from './node-rpc.service';

import * as CONST from '../../common/constants';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NodeService {
    public allNodes: any[] = [];
    public markers: any[] = [];
    public nodeBlockInfo = new EventEmitter<number>();
    public rpcEnabledNodes = new EventEmitter<number>();
    public updateNodes = new EventEmitter<any[]>();
    public updateMarkers = new EventEmitter<any[]>();

    constructor(private http: Http,
        private _nodeSignalRService: NodesSignalRService,
        private _nodeRpcService: NodeRpcService) {

        this.http.get(`${CONST.BASE_URL}/api/node/get`)
            .subscribe(res => {
                const nodes = res.json();
                this.updateAllNodes(res.json());
                this.sort();
                this.updateNodesData();
            }, err => {
                console.log(`error getting nodes`, err);
            });
    }

    private subscribeToEvents() {
        this._nodeSignalRService.messageReceived.subscribe((nodes: any[]) => {
            this.updateAllNodes(nodes);
            this.sort();
            this.updateNodesData();
        });
    }

    public getNodes(): any[] {
        return this.allNodes;
    }

    public getNode(id: number): Observable<Response> {
        return this.http.get(`${CONST.BASE_URL}/api/node/get/${id}`);
    }

    protected getJsonHeaders(): RequestOptions {
        const headers = new Headers({ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return new RequestOptions({ headers: headers });
    }

    public getConsensusNodes(): Observable<Response> {
        return this.http.get(`${CONST.BASE_URL}/api/node/consensus`, this.getJsonHeaders());
    }

    getNodeDisplayText(node: any) {
        return node.successUrl ? node.successUrl : node.ip;
    }

    updateNodesData() {
        console.log(`this.allNodes`, this.allNodes);
        this.allNodes.forEach(x => {
            this.getConnectionsCount(x);
            this.getVersion(x);
            this.getRawMemPool(x);
            this.getBlockCount(x);
            this.checkP2PStatus(x);
            this.sort();
        });
        this.updateAllMarkers();

        this.updateNodes.emit(this.allNodes);
        this.updateMarkers.emit(this.markers);
        this.rpcEnabledNodes.emit(this.allNodes.filter(x => x.rpcEnabled).length);
    }

    updateAllNodes(nodes: any): void {
        const that = this;
        nodes.forEach(x => {
            if (that.allNodes.find(z => that.getNodeDisplayText(z) === that.getNodeDisplayText(x))) {
                return;
            }

            x.displayText = this.getNodeDisplayText(x);
            x.p2pEnabled = true;
            that.allNodes.push(x);
        });
    }

    updateAllMarkers(): void {
        const markers = [];
        this.allNodes.forEach(x => {
            markers.push({
                id: x.id,
                latLng: [x.latitude, x.longitude],
                name: this.getNodeDisplayText(x),
                version: x.version,
                blockCount: x.blockCount
            });
        });
        this.markers = markers;
    }

    private getPeers(x: any) {
        this._nodeRpcService.callRpcMethod(x.successUrl, 'getpeers', 1)
            .subscribe(res => {
                x.lastResponseTime = Date.now();

                const json = res.json();
                if (json.result) {
                    // tslint:disable-next-line:radix
                    x.peers = parseInt(json.result.connected.length);
                } else {
                    console.log(res);
                }
            });
    }

    private checkP2PStatus(x): void {
        if (x && x.ip) {
            this.http.post(`${CONST.BASE_URL}/api/p2pstatus/checkip/${x.ip}`, null)
                .subscribe(res => {
                    x.p2pEnabled = res.json();
                }, err => {
                    console.log(err);
                });
        }
    }

    private getConnectionsCount(x: any) {
        this._nodeRpcService.callRpcMethod(x.successUrl, 'getconnectioncount', 1)
            .subscribe(res => {
                x.lastResponseTime = Date.now();

                const json = res.json();
                if (json.result) {
                    // tslint:disable-next-line:radix
                    x.connected = parseInt(json.result);
                    this.sort();
                } else {
                    console.log(res);
                }
            });
    }

    private getVersion(x: any) {
        const requestStart = Date.now();
        this._nodeRpcService.callRpcMethod(x.successUrl, 'getversion', 3)
            .subscribe(res => {
                const now = Date.now();
                x.lastResponseTime = now;
                x.latency = Math.round((now - requestStart));

                const response = res.json();
                x.version = response.result.useragent;
                x.rpcEnabled = true;
            }, err => {
                x.rpcEnabled = false;
                x.latency = 0;
            });
    }

    public getBlockCount(x: any) {
        this._nodeRpcService.callRpcMethod(x.successUrl, 'getblockcount', 3)
            .subscribe(res => {
                const now = Date.now();
                x.lastResponseTime = now;
                const response = res.json();
                x.blockCount = response.result;

                this.nodeBlockInfo.emit(response.result);
            }, err => {
                x.rpcEnabled = false;
                x.latency = 0;
            });
    }

    private getRawMemPool(x: any) {
        const url = `${x.protocol}://${x.url ? x.url : x.ip}:${x.port}`;
        const requestStart = Date.now();
        this._nodeRpcService.callRpcMethod(x.successUrl, 'getrawmempool', 1)
            .subscribe(res => {
                x.lastResponseTime = Date.now();
                //    x.latency = x.lastResponseTime - requestStart;
                const response = res.json();
                x.pendingTransactions = response.result.length;
                this.sort();
            });
    }

    private sort() {
        this.allNodes = this.allNodes.sort((x, y) => {
            if (!x.rpcEnabled && y.rpcEnabled) {
                return 1;
            } else if (x.rpcEnabled && !y.rpcEnabled) {
                return -1;
            }

            if (x.type !== 'RPC' && y.type === 'RPC') {
                return 1;
            } else if (x.type === 'RPC' && y.type !== 'RPC') {
                return -1;
            }

            if (!x.blockCount && y.blockCount) {
                return 1;
            } else if (x.blockCount && !y.blockCount) {
                return -1;
            } else if (x.blockCount !== y.blockCount) {
                return y.blockCount - x.blockCount;
            }

            if (!x.connected && y.connected) {
                return 1;
            } else if (!y.connected && x.connected) {
                return -1;
            } else if (x.connected !== y.connected) {
                return y.connected - x.connected;
            }

            return x.latency - y.latency;
        });
    }
}