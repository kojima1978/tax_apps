export const Computed = ({ value, unit }: { value: number | null; unit?: string }) => (
  <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
    <span style={{ flex: 1, textAlign: 'right', padding: '3px 2px' }}>
      {value !== null && value !== undefined ? value.toLocaleString() : ''}
    </span>
    {unit && <span className="whitespace-nowrap ml-0.5">{unit}</span>}
  </span>
);
