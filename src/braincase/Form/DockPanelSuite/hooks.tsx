import { Dispatch, ReactNode, SetStateAction, useRef, useState } from "react";

export class Point {
    constructor(public x: number, public y: number) {

    }

    public static delta(final: Point, initial: Point) {
        return new Point(final.x - initial.x, final.y - initial.y);
    }
}

export class Movable {

    start: Point = { x: 0, y: 0 };
    current: Point = { x: 0, y: 0 };
    isDragging: boolean = false;

    constructor(public onChange: (delta: Point, target: Point) => void) {

    }

    public onMouseDown(e: MouseEvent) {
        this._onStartDrag({ x: e.clientX, y: e.clientY });
    }

    public onTouchStart(e: TouchEvent) {
        const touch = e.touches.item(0);
        if (touch) {
            this._onStartDrag({ x: touch.clientX, y: touch.clientY });
        }
    }

    private _onMouseMove(e: MouseEvent) {
        this._onDrag({ x: e.clientX, y: e.clientY });
    }

    private _onTouchMove(e: TouchEvent) {
        const touch = e.touches.item(0);
        if (touch) {
            this._onDrag({ x: touch.clientX, y: touch.clientY });
        }
    }

    private _onMouseUp(e: MouseEvent) {
        this._onEndDrag({ x: e.clientX, y: e.clientY });
    }

    private _onTouchEnd(e: TouchEvent) {
        const touch = e.touches.item(0);
        if (touch) {
            this._onEndDrag({ x: touch.clientX, y: touch.clientY });
        }
    }

    private _onStartDrag(point: Point) {

        this.isDragging = true;
        this.start = point;
        this.current = point;

        document.addEventListener('mousemove', this._onMouseMove.bind(this));
        document.addEventListener('mouseup', this._onMouseUp.bind(this));
        document.addEventListener('touchmove', this._onTouchMove.bind(this));
        document.addEventListener('touchend', this._onTouchEnd.bind(this));

        this.__clearSelection();
    }

    private _onDrag(point: Point) {
        if (this.isDragging) {

            this.onChange(Point.delta(point, this.current), point);

            this.current = point;
            this.__clearSelection();
        }
    }

    private _onEndDrag(point: Point) {
        this.isDragging = false;

        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mouseup', this._onMouseUp);
        document.removeEventListener('touchmove', this._onTouchMove);
        document.removeEventListener('touchend', this._onTouchEnd);

    }

    private __clearSelection() {
        if (window.getSelection) {
            if (window.getSelection()?.empty) {  // Chrome
                window.getSelection()?.empty();
            } else if (window.getSelection()?.removeAllRanges) {  // Firefox
                window.getSelection()?.removeAllRanges();
            }
        }
        // } else if (document.selection) {  // IE?
        //     document.selection.empty();
        // }
    }
}


export class DragDropable {

    public onDragStart(e: DragEvent, sourceData: string) {
        e.dataTransfer?.setData('source-data', sourceData);
    }

    public onDragOver(e: DragEvent, canDrop: (e: DragEvent, data: string) => boolean) {
        const data = e.dataTransfer?.getData('source-data') ?? '';
        if (canDrop(e, data)) e.preventDefault();
    }

    public onDrop(e: DragEvent, action: (e: DragEvent, sourceData: string) => boolean) {
        const data = e.dataTransfer?.getData('source-data');
        if (data && action && action(e, data)) {
            e.stopImmediatePropagation();
        }
    }
}

export class CDockForm {
    constructor(public id: string,
        public title: string,
        public children?: ReactNode,
        public icon?: ReactNode) {
    }
}

export enum DockLayoutDirection {
    Horizontal = 'Horizontal',
    Vertical = 'Vertical'
}


export enum DockLayoutItemType {
    Splitter = 'Splitter',
    Panel = 'Panel'
}

export class CDockLayoutItem {
    constructor(public id: string, public type: DockLayoutItemType) { }
}


export class CDockSplitter extends CDockLayoutItem {
    constructor(
        public id: string,
        public primary: CDockLayoutItem,
        public secondary: CDockLayoutItem,
        public direction: DockLayoutDirection,
        public size: number
    ) {
        super(id, DockLayoutItemType.Splitter);
    }
}

export class CDockPanel extends CDockLayoutItem {
    constructor(public id: string,
        public forms: CDockForm[]) {
        super(id, DockLayoutItemType.Panel);
    }
}

export interface IDockManager {
    layout: CDockLayoutItem
    setLayout: Dispatch<SetStateAction<CDockLayoutItem>>,
    clone: (layout: CDockLayoutItem) => CDockLayoutItem,
    createForm: (title: string, children?: ReactNode, icon?: ReactNode) => CDockForm
    createPanel: (forms: CDockForm[]) => CDockPanel
    createSplitter: (primary: CDockLayoutItem, secondary: CDockLayoutItem, direction?: DockLayoutDirection, size?: number) => CDockSplitter,
    stack: (formId: string, panelId: string) => void,
    split: (formId: string, destPanelId: string, direction: DockLayoutDirection) => void
}

export const useDockManager = (): IDockManager => {

    const counter = useRef(0);

    const _hash = (prefix: string) => {
        return `${prefix}-${++counter.current}`;
    }

    const clone = (layout: CDockLayoutItem) => {
        return JSON.parse(JSON.stringify(layout));
    }

    const createForm = (title: string, children?: ReactNode, icon?: ReactNode) => {
        return new CDockForm(_hash('dmf'), title, children, icon)
    }

    const createPanel = (forms: CDockForm[]) => {
        return new CDockPanel(_hash('dmp'), forms);
    }

    const createSplitter = (primary: CDockLayoutItem, secondary: CDockLayoutItem, direction: DockLayoutDirection = DockLayoutDirection.Horizontal, size: number = 50) => {
        return new CDockSplitter(_hash('dms'), primary, secondary, direction, size);
    }

    const [layout, setLayout] = useState<CDockLayoutItem>(createPanel([]));

    const split = (formId: string, destPanelId: string, direction: DockLayoutDirection) => {

        setLayout(layout => {

            // find the form and its panel
            const [form, panel] = _findForm(layout, formId);

            if (form && panel) {
                if (panel.id === destPanelId && panel.forms.length <= 1) {
                    console.log('cannot split a panel with only 1 form');
                    return layout; // do nothing
                } else {
                    // remove form from panel
                    const index = panel.forms.findIndex(f => f.id === formId);
                    panel.forms.splice(index, 1);

                    // find the destination panel
                    const [destPanel, parent, grandparent] = _findLayoutItem(layout, destPanelId, null, null);
                    if (destPanel) {
                        // prepare a new splitter with both the old and new panel
                        const newPanel = createPanel([form]);
                        const newSplitter = createSplitter(destPanel, newPanel, direction);

                        // check where is the original location of the destination panel
                        // and insert the new splitter at the location
                        if (parent) {
                            if (parent.primary.id === destPanel.id) {
                                parent.primary = newSplitter;
                            } else if (parent.secondary.id === destPanel.id) {
                                parent.secondary = newSplitter;
                            }
                        } else {
                            layout = newSplitter;
                        }
                    }

                    layout = _occupyFreeSpace(layout, layout);
                }
            }

            return { ...layout };
        });
    }

    const stack = (formId: string, panelId: string) => {

        setLayout(prev => {
            // extract the form
            const [form, panel] = _findForm(layout, formId);
            if (form && panel) {
                // remove form from panel
                const index = panel.forms.findIndex(f => f.id === formId);
                panel.forms.splice(index, 1);
            }

            // put the form into the destination panel
            const [destination] = _findLayoutItem(prev, panelId, null, null);
            if (form && destination) {

                // add form to destination panel
                (destination as CDockPanel).forms.push(form);

                prev = _occupyFreeSpace(layout, layout);
            }

            return { ...prev };
        });
    }

    const _occupyFreeSpace = (root: CDockLayoutItem, start: CDockLayoutItem) => {

        if (start.type === DockLayoutItemType.Splitter) {

            const splitter = start as CDockSplitter;
            if (splitter.primary.type === DockLayoutItemType.Splitter) {
                _occupyFreeSpace(root, splitter.primary);
            }

            if (splitter.secondary.type === DockLayoutItemType.Splitter) {
                _occupyFreeSpace(root, splitter.secondary);
            }

            if (splitter.primary.type === DockLayoutItemType.Panel) {

                const panel1 = splitter.primary as CDockPanel;
                if (panel1.forms.length === 0) {
                    return _replace(root, splitter, splitter.secondary as CDockPanel);
                }
            }

            if (splitter.secondary.type === DockLayoutItemType.Panel) {
                const panel2 = splitter.secondary as CDockPanel;
                if (panel2.forms.length === 0) {
                    return _replace(root, splitter, splitter.primary as CDockPanel);
                }

            }
        }

        return root;
    }

    const _replace = (root: CDockLayoutItem, oldItem: CDockSplitter, newItem: CDockPanel): CDockLayoutItem => {
        const [found, parent, grandparent] = _findLayoutItem(root, oldItem.id, null, null);
        if (found && parent) {
            if (found.id === parent.primary.id) {
                parent.primary = newItem;
            } else if (found.id === parent.secondary.id) {
                parent.secondary = newItem;
            }

            return root;
        } else {
            return newItem;
        }
    }

    const _findForm = (layoutItem: CDockLayoutItem, formId: string): [CDockForm | null, CDockPanel | null] => {
        if (layoutItem.type === DockLayoutItemType.Panel) {
            const panel = (layoutItem as CDockPanel);
            const form = panel.forms.find(f => f.id === formId)
            if (form) return [form, panel];
            else return [null, null];

        } else if (layoutItem.type === DockLayoutItemType.Splitter) {
            const splitter = (layoutItem as CDockSplitter)
            const [form, panel] = _findForm(splitter.primary, formId);
            if (Boolean(form)) {
                return [form, panel];
            }
            else {
                const [form, panel] = _findForm(splitter.secondary, formId);
                if (Boolean(form)) {
                    return [form, panel];
                }
            }
        }

        return [null, null];
    }

    const _findLayoutItem = (layoutItem: CDockLayoutItem, searchId: string, parent: CDockSplitter | null, grandparent: CDockSplitter | null)
        : [found: CDockLayoutItem | null, parent: CDockSplitter | null, grandparent: CDockSplitter | null] => {

        if (searchId === layoutItem.id) {
            // found!
            return [layoutItem, parent, grandparent];
        }

        else if (layoutItem.type === DockLayoutItemType.Splitter) {
            const splitter = layoutItem as CDockSplitter;
            const [_found, _parent, _grandparent] = _findLayoutItem(splitter.primary, searchId, splitter, parent);
            if (Boolean(_found)) {
                return [_found, _parent, _grandparent];
            }
            else {
                const [_found, _parent, _grandparent] = _findLayoutItem(splitter.secondary, searchId, splitter, parent);
                if (Boolean(_found)) {
                    return [_found, _parent, _grandparent];
                }
            }
        }
        return [null, null, null];
    }

    return {
        layout, setLayout, clone, createForm, createPanel, createSplitter, stack, split
    }
}
