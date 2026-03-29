import { COMPANY_INFO, getFullAddress } from '@/lib/company';
import { useStaffInfo } from '@/contexts/StaffContext';
import { formatDate } from '@/lib/utils';

interface PrintHeaderProps {
    title: string;
}

const PrintHeader = ({ title }: PrintHeaderProps) => {
    const { staffName, staffPhone } = useStaffInfo();
    const hasStaff = staffName || staffPhone;
    const todayStr = formatDate(new Date());

    return (
        <div className="print-header-block">
            <div className="print-header-title-row">
                <h1>{title}</h1>
                <address>
                    <p className="company-name">{COMPANY_INFO.name}</p>
                    <p>{getFullAddress()}</p>
                    <p>TEL: {COMPANY_INFO.phone}</p>
                    {hasStaff && (
                        <p>
                            {staffName && <>担当: {staffName}</>}
                            {staffName && staffPhone && '　'}
                            {staffPhone && <>TEL: {staffPhone}</>}
                        </p>
                    )}
                    <p>作成日: {todayStr}</p>
                </address>
            </div>
        </div>
    );
};

export default PrintHeader;
