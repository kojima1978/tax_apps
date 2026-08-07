import { TABS, type TabKey } from "@/lib/tabs";

type TabNavProps = {
    active: TabKey;
    onChange: (key: TabKey) => void;
};

const TabNav = ({ active, onChange }: TabNavProps) => (
    <div className="tab-nav no-print" role="tablist" aria-label="譲渡資産の種類">
        {TABS.map((tab) => (
            <button
                key={tab.key}
                type="button"
                role="tab"
                id={`tab-${tab.key}`}
                aria-selected={tab.key === active}
                aria-controls={`panel-${tab.key}`}
                className={`tab-btn${tab.key === active ? " active" : ""}`}
                onClick={() => onChange(tab.key)}
            >
                <span className="tab-label">{tab.label}</span>
                <span className="tab-desc">{tab.description}</span>
            </button>
        ))}
    </div>
);

export default TabNav;
