import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { toast } from "react-toastify";
import { create } from "zustand";
import { wrapGame } from "../util/compiler";
import { debug } from "../util/logs";
import { useProject } from "./useProject";

type EditorRuntime = {
    editor: editor.IStandaloneCodeEditor | null;
    monaco: Monaco | null;
    currentFile: string;
    gylphDecorations: editor.IEditorDecorationsCollection | null;
    iframe: HTMLIFrameElement | null;
    console: Console | null;
    kaplayVersions: string[];
};

type EditorStore = {
    runtime: EditorRuntime;
    update: (value?: string) => void;
    run: () => void;
    getRuntime: () => EditorRuntime;
    setRuntime: (runtime: Partial<EditorRuntime>) => void;
    setCurrentFile: (currentFile: string) => void;
    setTheme: (theme: string) => void;
    /**
     * Update Gylph image decorations for loadXXXX functions
     */
    updateImageDecorations: () => void;
    updateModelMarkers: () => void;
    showNotification: (message: string) => void;
    setEditorValue: (value: string) => void;
    updateAndRun: () => void;
};

export const useEditor = create<EditorStore>((set, get) => ({
    runtime: {
        editor: null,
        monaco: null,
        currentFile: "main.js",
        gylphDecorations: null,
        iframe: null,
        console: null,
        isDefaultExample: false,
        kaplayVersions: [],
    },
    setRuntime: (runtime) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                ...runtime,
            },
        }));
    },
    getRuntime: () => get().runtime,
    setCurrentFile: (currentFile) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                currentFile,
            },
        }));
    },
    update: (customValue?: string) => {
        if (customValue) {
            debug(0, "[codeEditor] Editor value updated with custom value");

            get().setEditorValue(customValue);
            return;
        }

        const currentFile = useProject.getState().getFile(
            get().getRuntime().currentFile,
        );
        if (!currentFile) return;

        debug(
            0,
            "[monaco] Editor value updated with",
            currentFile.path.slice(0, 25) + "...",
        );

        get().setEditorValue(currentFile.value);
        get().updateImageDecorations();
    },
    setTheme: (theme: string) => {
        const editor = get().runtime.editor;
        if (!editor) return;

        editor.updateOptions({
            theme,
        });
    },
    run() {
        const iframe = document.querySelector<HTMLIFrameElement>("#game-view");
        if (!iframe) return;

        const {
            getKAPLAYFile,
            getMainFile,
            getAssetsFile,
            getProject,
        } = useProject.getState();
        if (!iframe) return;

        let mainFile = getMainFile()?.value ?? "";
        let parsedFiles = "";

        if (getProject().mode === "ex") {
            parsedFiles = mainFile;
        } else {
            let sceneFiles = "";
            let objectFiles = "";
            let utilFiles = "";
            let KAPLAYFile = getKAPLAYFile()?.value ?? "";
            let assetsFile = getAssetsFile()?.value ?? "";

            getProject().files.forEach((file) => {
                if (file.kind == "scene") {
                    sceneFiles += `\n${file.value}\n`;
                } else if (file.kind == "obj") {
                    objectFiles += `\n${file.value}\n`;
                } else if (file.kind == "util") {
                    utilFiles += `\n${file.value}\n`;
                }
            });

            parsedFiles = `${KAPLAYFile}\n\n 
            ${assetsFile}\n\n 
            ${utilFiles}\n\n
            ${objectFiles}\n\n
            ${sceneFiles}\n\n 
            ${mainFile}`;
        }

        iframe.srcdoc = wrapGame(parsedFiles);
    },
    updateImageDecorations() {
        debug(0, "[monaco] Updating gylph decorations");
        const editor = get().runtime.editor;
        const monaco = get().runtime.monaco;
        const gylphDecorations = get().runtime.gylphDecorations;
        const model = editor?.getModel();

        if (!editor || !monaco || !model || !gylphDecorations) return;

        const regexLoad = /load\w+\(\s*"[^"]*",\s*"([^"]*)"\s*\)/g;

        // for each every line
        const lines = editor.getModel()?.getLinesContent() ?? [];

        let linesRange: {
            image: string;
            line: number;
        }[] = [];

        lines.forEach((line, index) => {
            const match = line.match(regexLoad);
            if (!match) return;

            const url = line.replace(regexLoad, (_, url) => {
                return url;
            });

            const normalizedUrl = url.replace(/^\/|\/$/g, "").replace(
                /"/g,
                "",
            ).replace(";", "");

            const projectAsset = useProject.getState().project.assets
                .get(
                    normalizedUrl.replace("assets/", ""),
                );

            if (projectAsset) {
                return linesRange.push({
                    image: projectAsset.url,
                    line: index + 1,
                });
            }

            linesRange.push({
                image: `http://localhost:5173/${normalizedUrl}`,
                line: index + 1,
            });
        });

        const decorations = linesRange.map(
            ({ image, line }) => {
                return {
                    range: new monaco.Range(line, 1, line, 1),
                    options: {
                        glyphMarginClassName:
                            "monaco-glyph-margin-preview-image",
                        glyphMarginHoverMessage: {
                            value: `![image](${image})`,
                            isTrusted: true,
                        },
                        hoverMessage: {
                            value: image,
                        },
                    },
                } satisfies editor.IModelDeltaDecoration;
            },
        );

        gylphDecorations.set(decorations);
    },
    updateModelMarkers() {
        debug(0, "[monaco] Updating gylph decorations");
        const editor = get().runtime.editor;
        const monaco = get().runtime.monaco;
        const model = editor?.getModel();

        if (!editor || !monaco || !model) return;

        const regexAdd = /add\(\[[^"]\]\)/g;

        // for each every line
        const lines = editor.getModel()?.getLinesContent() ?? [];

        let linesRange: {
            image: string;
            line: number;
        }[] = [];

        lines.forEach((line, index) => {
            const match = line.match(regexAdd);
            if (!match) return;

            const url = line.replace(regexAdd, (_, url) => {
                return url;
            });

            const normalizedUrl = url.replace(/^\/|\/$/g, "").replace(
                /"/g,
                "",
            ).replace(";", "");

            const projectAsset = useProject.getState().project.assets
                .get(
                    normalizedUrl.replace("assets/", ""),
                );

            if (projectAsset) {
                return linesRange.push({
                    image: projectAsset.url,
                    line: index + 1,
                });
            }

            linesRange.push({
                image: `http://localhost:5173/${normalizedUrl}`,
                line: index + 1,
            });
        });
    },
    showNotification(message) {
        toast(message);
    },
    setEditorValue(value) {
        const editor = get().runtime.editor;
        if (!editor) return;

        debug(
            0,
            "[editor] Setting editor value to",
            value.slice(0, 25) + "...",
        );

        editor.setValue(value);
    },
    updateAndRun() {
        get().getRuntime().editor?.setScrollTop(0);
        get().update();
        get().run();
    },
}));
