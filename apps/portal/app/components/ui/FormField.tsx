interface FormFieldBase {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  hint?: string
}

interface TextFieldProps extends FormFieldBase {
  type?: 'text'
  placeholder?: string
  maxLength?: number
}

interface TextareaFieldProps extends FormFieldBase {
  type: 'textarea'
  placeholder?: string
  maxLength?: number
  rows?: number
}

interface SelectFieldProps extends FormFieldBase {
  type: 'select'
  options: string[]
}

type FormFieldProps = TextFieldProps | TextareaFieldProps | SelectFieldProps

const fieldClassName = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900'

export default function FormField(props: FormFieldProps) {
  const { label, id, value, onChange, required, hint, type = 'text' } = props

  const field = type === 'textarea' ? (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldClassName} resize-none`}
      placeholder={'placeholder' in props ? props.placeholder : undefined}
      maxLength={'maxLength' in props ? props.maxLength : undefined}
      rows={'rows' in props ? props.rows : undefined}
      required={required}
    />
  ) : type === 'select' ? (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClassName}
      required={required}
    >
      {'options' in props && props.options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  ) : (
    <input
      type="text"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClassName}
      placeholder={'placeholder' in props ? props.placeholder : undefined}
      maxLength={'maxLength' in props ? props.maxLength : undefined}
      required={required}
    />
  )

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {field}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}
