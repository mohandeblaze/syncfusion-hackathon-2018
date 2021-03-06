import * as path from 'path';
import * as vscode from 'vscode';
import * as dataCheck from './data-index';
import { GitlabSyncfusion } from './gitlab';
import { TreeData } from './repo-data';
import { getTimers, attachTimer } from './timers';

export class MrOpened implements vscode.TreeDataProvider<any> {
    onDidChangeTreeData?: vscode.Event<any> | undefined;

    readonly currentUser_url = 'https://gitlab.syncfusion.com/api/v4/user';
    readonly url = 'https://gitlab.syncfusion.com/api/v4/merge_requests?state=opened';

    async getTreeItem(element: any): Promise<any> {
        if (!element.branch) {
            const treeItem = new TreeData(element.title, vscode.TreeItemCollapsibleState.None, {
                title: '',
                command: 'vscode.open',
                arguments: [vscode.Uri.parse(element.web_url)],
                tooltip: ''
            });
            treeItem.iconPath = {
                dark: path.join(path.resolve(__dirname, '../resources/dark'), 'icon-git.svg'),
                light: path.join(path.resolve(__dirname, '../resources/light'), 'icon-git.svg')
            };
            return treeItem;
        }
        let treeItem = new TreeData(element.branch, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = {
            dark: path.join(path.resolve(__dirname, '../resources/dark'), 'icon-branch.svg'),
            light: path.join(path.resolve(__dirname, '../resources/light'), 'icon-branch.svg')
        };
        return treeItem;
    }

    async getChildren(element?: any): Promise<any> {
        let data = await GitlabSyncfusion.getData('https://gitlab.syncfusion.com/api/v4/user');
        if (data) {
            if (data.message) {
                vscode.window.showInformationMessage(`${data.message}, invalid token. Please set valid gitlab access token`);
                return [];
            }
            if(data.error) {
                vscode.window.showInformationMessage(data.error_description);
                return [];
            }
        }
        if (element) {
            this.dataCheck();
            return await this.getOnlyFromTargetBranch(element.branch);
        }

        return dataCheck.getBranchArray();
    }

    async getCurrentUser() {
        return await GitlabSyncfusion.getData(this.currentUser_url);
    }

    /**
     * @todo clear hardcoded assignee id and get from current user
     */
    async getOnlyFromTargetBranch(branch: string) {
        let timers = getTimers();
        timers.forEach((timer) => {
            clearInterval(timer);
        });
        let data = await this.getData();
        let final = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i].target_branch === branch) {
                final.push(data[i]);
                let timer = setInterval(() => vscode.window.showInformationMessage('MR(' + data[i].description + ') is Opened from' + data[i].updated_at + '\n Target Branch :' + data[i].target_branch + '\n Merge Status :' + data[i].merge_status + '\n Please do necessary actions'), 900000);
                attachTimer(timer);
            }
        }
        return final;
    }

    async getData() {
        let currentUser = await this.getCurrentUser();
        let url = this.url.replace('{{id}}', currentUser.id);
        let data = await GitlabSyncfusion.getData(url);
        return data;
    }

    async dataCheck() {
        let prev = dataCheck.getOpenMr();
        let data = await this.getData();
        let currentData = data[0] ? data[0].id.toString() : 'no_data';
        dataCheck.updateOpenMr(currentData);

        if (currentData !== prev || (prev.toString() !== 'no_data' && dataCheck.getOpenMr().toString() === 'no_data')) {
            vscode.window.showInformationMessage('Something changed');
        }
    }

}
