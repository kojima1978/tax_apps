import { InfoIcon } from "./Icons";

type NoteListProps = {
    title?: string;
    notes: string[];
};

const NoteList = ({ title = "計算上の補足", notes }: NoteListProps) => {
    if (notes.length === 0) return null;

    return (
        <div className="note-list">
            <h4>
                <InfoIcon />
                {title}
            </h4>
            <ul>
                {notes.map((note) => (
                    <li key={note}>{note}</li>
                ))}
            </ul>
        </div>
    );
};

export default NoteList;
