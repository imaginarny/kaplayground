import { assets } from "@kaplayjs/crew";
import type { FC } from "react";
import { useProject } from "../../hooks/useProject";
import { cn } from "../../util/cn";

type LoadedProject = {
    name: string;
    formattedName: string;
    description: string | null;
    id: number;
    difficulty?: string;
    tags?: string[];
    version: string;
};

type Props = {
    project: LoadedProject;
    isProject?: boolean;
};

const imagesPerDifficulty: Record<string, string> = {
    "easy": assets.bean.outlined,
    "medium": assets.ghosty.outlined,
    "hard": assets.burpman.outlined,
    "auto": assets.ghostiny.outlined,
};

export const ProjectEntry: FC<Props> = ({ project: example, isProject }) => {
    const { createNewProjectFromDemo, loadProject, currentSelection } =
        useProject();

    const handleClick = () => {
        const dialog = document.querySelector<HTMLDialogElement>(
            "#examples-browser",
        );

        if (!dialog?.open) return;

        if (isProject) {
            loadProject(example.name);
        } else {
            createNewProjectFromDemo(example.id);
        }

        dialog?.close();
    };

    return (
        <article
            className={cn(
                "bg-base-200 px-4 pt-3.5 pb-3 rounded-lg flex flex-col gap-2 cursor-pointer min-h-20 hover:bg-base-content/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-base-content transition-colors",
                {
                    "bg-base-content/10 ring-1 ring-inset ring-base-content/[4%]":
                        currentSelection == example.name,
                },
            )}
            onClick={handleClick}
            onKeyUpCapture={e => e.key == "Enter" && handleClick()}
            tabIndex={0}
            role="button"
        >
            <div className="flex flex-col gap-1.5 flex-1">
                <h2 className="text-lg font-medium text-white">
                    {example.formattedName}
                </h2>
                {example.description && (
                    <p className="text-[0.94rem] leading-snug -mt-0.5">
                        {example.description}
                    </p>
                )}

                <div className="flex flex-col gap-1.5 mt-auto">
                    {example.difficulty && (
                        <p
                            className={cn(
                                "font-bold text-xs tracking-wider uppercase flex items-center gap-2 py-1",
                                {
                                    "text-primary":
                                        example.difficulty === "easy",
                                    "text-warning":
                                        example.difficulty === "medium",
                                    "text-error": example.difficulty === "hard",
                                    "text-gray-400":
                                        example.difficulty === "auto",
                                },
                            )}
                        >
                            <img
                                src={imagesPerDifficulty[example.difficulty]}
                                alt={example.difficulty}
                                className="inline h-[1.125rem] w-[1.125rem] object-scale-down"
                            />

                            {example.difficulty}
                        </p>
                    )}

                    {!!example?.tags?.length && (
                        <div className="flex flex-wrap gap-1 -mx-1.5">
                            {example.tags?.map((tag) => (
                                <span
                                    key={tag}
                                    className="badge badge-neutral badge-sm h-auto py-0.5"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
};
