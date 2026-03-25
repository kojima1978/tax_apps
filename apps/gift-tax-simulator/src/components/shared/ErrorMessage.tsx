type Props = {
    message: string;
};

const ErrorMessage = ({ message }: Props) => {
    if (!message) return null;
    return <div className="error-msg" role="alert">{message}</div>;
};

export default ErrorMessage;
