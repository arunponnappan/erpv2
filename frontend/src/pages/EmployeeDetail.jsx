
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '../context/LayoutContext';
import api from '../services/api';
import { ArrowLeft, User, Mail, Phone, Calendar, Building2, Briefcase, FileText } from 'lucide-react';
import styles from './EmployeeDetail.module.css';

const EmployeeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setHeader } = useLayout();
    const [employee, setEmployee] = useState(null);
    const [branchName, setBranchName] = useState('Loading...');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const response = await api.get(`/hr/employees/${id}`);
                setEmployee(response.data);

                if (response.data.branch_id) {
                    try {
                        const branchRes = await api.get(`/org/branches/`);
                        // Optimisation: ideally fetch single branch or have map. 
                        // For now fetching all to match ID.
                        const b = branchRes.data.find(x => x.id === response.data.branch_id);
                        setBranchName(b ? b.name : 'Unknown');
                    } catch (e) {
                        setBranchName('Unknown');
                    }
                } else {
                    setBranchName('Unassigned');
                }

            } catch (error) {
                console.error("Failed to fetch employee", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [id]);

    useEffect(() => {
        setHeader('Employee Details');
    }, []);

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (!employee) return <div className={styles.error}>Employee not found</div>;

    return (
        <div className={styles.container}>
            <button className={styles.backBtn} onClick={() => navigate('/employees')}>
                <ArrowLeft size={20} /> Back to List
            </button>

            <div className={`glass-card ${styles.card}`}>
                <div className={styles.header}>
                    <div className={styles.avatar}>
                        {employee.profile_photo_url ? (
                            <img src={employee.profile_photo_url} alt="Profile" className={styles.avatarImg} />
                        ) : (
                            <span>{employee.first_name[0]}{employee.last_name[0]}</span>
                        )}
                    </div>
                    <div>
                        <h1>{employee.first_name} {employee.middle_name ? `${employee.middle_name} ` : ''}{employee.last_name}</h1>
                        <span className={styles.role}>{employee.job_position?.title || 'Unassigned'}</span>
                    </div>
                    <div className={styles.idBadge}>
                        ID: {employee.employee_id}
                    </div>
                </div>

                <div className={styles.grid}>
                    {/* PERSONAL INFO */}
                    <div className={styles.section}>
                        <h2><User size={18} /> Personal Info</h2>
                        <div className={styles.row}>
                            <label>Gender</label>
                            <span>{employee.gender || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Date of Birth</label>
                            <span>{employee.date_of_birth || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Marital Status</label>
                            <span>{employee.marital_status || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Blood Group</label>
                            <span>{employee.blood_group || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>National ID</label>
                            <span>{employee.national_id_number || '-'}</span>
                        </div>
                    </div>

                    {/* CONTACT INFO */}
                    <div className={styles.section}>
                        <h2><Phone size={18} /> Contact Info</h2>
                        <div className={styles.row}>
                            <label>Work Email</label>
                            <span>{employee.work_email}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Personal Email</label>
                            <span>{employee.personal_email || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Mobile</label>
                            <span>{employee.mobile_phone || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Personal Phone</label>
                            <span>{employee.personal_phone || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Address</label>
                            <span>
                                {employee.address_line1 ? (
                                    <>
                                        {employee.address_line1}<br />
                                        {employee.address_city}, {employee.address_state}<br />
                                        {employee.address_country} {employee.address_zip}
                                    </>
                                ) : '-'}
                            </span>
                        </div>
                    </div>

                    {/* WORK INFO */}
                    <div className={styles.section}>
                        <h2><Briefcase size={18} /> Work Info</h2>
                        <div className={styles.row}>
                            <label>Department</label>
                            <span>{employee.department?.name || 'Unassigned'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Branch</label>
                            <span>{branchName}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Employment Type</label>
                            <span>{employee.employment_type?.name || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Reporting Manager</label>
                            <span>
                                {employee.reporting_manager_id ? 'Manager ID: ' + employee.reporting_manager_id : '-'}
                            </span>
                        </div>
                        <div className={styles.row}>
                            <label>Joining Date</label>
                            <span>{employee.joining_date}</span>
                        </div>
                    </div>

                    {/* EMERGENCY INFO */}
                    <div className={styles.section}>
                        <h2><Building2 size={18} /> Emergency Contact</h2>
                        <div className={styles.row}>
                            <label>Name</label>
                            <span>{employee.emergency_contact_name || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Relationship</label>
                            <span>{employee.emergency_contact_relation || '-'}</span>
                        </div>
                        <div className={styles.row}>
                            <label>Phone</label>
                            <span>{employee.emergency_contact_phone || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetail;
