interface FormFieldProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  type?: 'text' | 'textarea'
  rows?: number
  required?: boolean
}

const fieldClassName = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900'

export default function FormField({ label, id, value, onChange, placeholder, maxLength, type = 'text', rows, required }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClassName} resize-none`}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          required={required}
        />
      ) : (
        <input
          type="text"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClassName}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
        />
      )}
    </div>
  )
}
