import Navigation from './Navigation';

type Props = {
    className?: string;
    children: React.ReactNode;
};

const PageLayout = ({ className, children }: Props) => (
    <div className={`container-custom ${className ?? ''}`}>
        <Navigation />
        <main>{children}</main>
    </div>
);

export default PageLayout;
