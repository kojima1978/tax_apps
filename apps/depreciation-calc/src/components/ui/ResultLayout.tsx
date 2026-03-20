import { type ReactNode } from "react";
import DirtyWarning from "@/components/ui/DirtyWarning";
import ConditionTags from "@/components/ui/ConditionTags";
import EmptyState from "@/components/ui/EmptyState";
import Disclaimer from "@/components/ui/Disclaimer";

type ResultLayoutProps = {
    title: string;
    emptyIcon: string;
    emptyLines: string[];
    hasResult: boolean;
    isDirty: boolean;
    tags: string[];
    children: ReactNode;
};

const ResultLayout = ({ title, emptyIcon, emptyLines, hasResult, isDirty, tags, children }: ResultLayoutProps) => (
    <section className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4">{title}</h2>
        {!hasResult ? (
            <EmptyState icon={emptyIcon} lines={emptyLines} />
        ) : (
            <>
                <DirtyWarning isDirty={isDirty} />
                <ConditionTags tags={tags} />
                {children}
                <Disclaimer />
            </>
        )}
    </section>
);

export default ResultLayout;
