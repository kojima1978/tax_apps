import { getFullAddress, useCompanyInfo } from '@/shared/staff-directory/company';
import { useStaffInfo } from '@/contexts/StaffContext';
import { formatDate } from '@/lib/utils';

interface PrintHeaderProps {
    title: string;
}

const PrintHeader = ({ title }: PrintHeaderProps) => {
    const { staffName, staffPhone } = useStaffInfo();
    const { company } = useCompanyInfo();
    const hasStaff = staffName || staffPhone;
    const todayStr = formatDate(new Date());

    return (
        <div className="print-header-block">
            <div className="print-header-title-row">
                <h1>{title}</h1>
                <address>
                    <p className="company-name">{company.name}</p>
                    {/* 電話番号は住所と同じ行に置いてヘッダーの行数を減らす */}
                    <p>{getFullAddress(company)}　TEL: {company.phone}</p>
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
