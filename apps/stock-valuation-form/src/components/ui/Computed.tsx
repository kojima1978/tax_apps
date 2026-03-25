export const Computed = ({ value, unit, formula }: { value: number | null; unit?: string; formula?: string }) => (
  <span style={{ display: 'flex', alignItems: 'center', width: '100%' }} title={formula}>
    <span style={{ flex: 1, textAlign: 'right', padding: '3px 2px', cursor: formula ? 'help' : undefined }}>
      {value !== null && value !== undefined ? value.toLocaleString() : ''}
    </span>
    {unit && <span className="whitespace-nowrap ml-0.5">{unit}</span>}
  </span>
);
