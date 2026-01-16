// 共通ボタンスタイル定義

export const buttonStyle = {
  whiteSpace: 'nowrap' as const,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'white',
  color: 'black',
  border: '1px solid #d1d5db',
  transition: 'all 0.2s ease',
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  fontWeight: '500'
};

export const smallButtonStyle = {
  whiteSpace: 'nowrap' as const,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'white',
  color: 'black',
  border: '1px solid #d1d5db',
  transition: 'all 0.2s ease',
  fontSize: '0.875rem',
  padding: '0.5rem 1rem'
};

export const inlineButtonStyle = {
  whiteSpace: 'nowrap' as const,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: 'white',
  color: 'black',
  border: '1px solid #d1d5db',
  transition: 'all 0.2s ease',
  fontSize: '0.75rem',
  padding: '0.25rem 0.5rem',
  marginLeft: '0.5rem',
  borderRadius: '0.375rem'
};

export const buttonHoverClass = 'hover:bg-gray-200 hover:border-gray-400 cursor-pointer';

export const btnHoverClass = 'btn hover:bg-gray-200 hover:border-gray-400';
