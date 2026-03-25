import Navigation from './Navigation';
import PrintFooter from './PrintFooter';

type Props = {
    className?: string;
    children: React.ReactNode;
};

const PageLayout = ({ className, children }: Props) => (
    <div className={`container-custom ${className ?? ''}`}>
        <Navigation />
        <main>{children}</main>
        <PrintFooter />
    </div>
);

export default PageLayout;
