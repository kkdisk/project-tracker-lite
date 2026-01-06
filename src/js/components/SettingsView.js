// ==================== Phase 1: 系統管理介面組件 ====================
// 將此代碼插入到 index.html 的 App 組件定義之前（約第 2100 行之前）

// ===== Settings Icon（已定義在 paths 中，確認是否存在）=====

// ===== SettingsView 主組件 =====
const SettingsView = () => {
    const [activeTab, setActiveTab] = useState('teams');
    const [teams, setTeams] = useState([]);
    const [projects, setProjects] = useState([]);
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(false);

    // 載入所有資料
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([loadTeams(), loadProjects(), loadOwners()]);
        } catch (error) {
            console.error('❌ 載入資料失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTeams = async () => {
        try {
            const data = await window.callApi('getTeams');
            if (data.success) {
                setTeams(data.data);
                console.log('✅ 載入 Teams:', data.data.length);
            }
        } catch (error) {
            console.error('❌ 載入 Teams 失敗:', error);
        }
    };

    const loadProjects = async () => {
        try {
            const data = await window.callApi('getProjects');
            if (data.success) {
                setProjects(data.data);
                console.log('✅ 載入 Projects:', data.data.length);
            }
        } catch (error) {
            console.error('❌ 載入 Projects 失敗:', error);
        }
    };

    const loadOwners = async () => {
        try {
            const data = await window.callApi('getOwners');
            if (data.success) {
                setOwners(data.data);
                console.log('✅ 載入 Owners:', data.data.length);
            }
        } catch (error) {
            console.error('❌ 載入 Owners 失敗:', error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* 標題 */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Icon path={paths.settings} size={28} />
                        系統設定
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">管理部門、專案和負責人</p>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('teams')}
                            className={`px-6 py-3 text-sm font-medium transition ${activeTab === 'teams'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            Teams (部門)
                        </button>
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`px-6 py-3 text-sm font-medium transition ${activeTab === 'projects'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            Projects (專案)
                        </button>
                        <button
                            onClick={() => setActiveTab('owners')}
                            className={`px-6 py-3 text-sm font-medium transition ${activeTab === 'owners'
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            Owners (負責人)
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-slate-500">載入中...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'teams' && (
                            <TeamsManager
                                teams={teams}
                                onReload={loadTeams}
                            />
                        )}
                        {activeTab === 'projects' && (
                            <ProjectsManager
                                projects={projects}
                                onReload={loadProjects}
                            />
                        )}
                        {activeTab === 'owners' && (
                            <OwnersManager
                                owners={owners}
                                onReload={loadOwners}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ===== TeamsManager 組件 =====
const TeamsManager = ({ teams, onReload }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (team) => {
        setEditingItem(team);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const teamData = {
            teamName: formData.get('teamName'),
            deptCode: formData.get('deptCode'),
            isActive: formData.get('isActive') === 'on'
        };

        if (editingItem) {
            teamData.id = editingItem.id;
        }

        try {
            const action = editingItem ? 'updateTeam' : 'addTeam';
            // 使用 callApi 替代 fetch
            await window.callApi(action, teamData);

            console.log(`✅ ${editingItem ? '更新' : '新增'} Team 成功`);
            setIsModalOpen(false);
            // 延遲重新載入
            setTimeout(() => onReload(), 1000);
        } catch (error) {
            console.error('❌ 儲存失敗:', error);
            alert('儲存失敗，請重試');
        }
    };

    const handleDelete = async (id) => {
        try {
            await window.callApi('deleteTeam', { id });

            console.log('✅ 刪除 Team 成功');
            setDeleteConfirm(null);
            setTimeout(() => onReload(), 1000);
        } catch (error) {
            console.error('❌ 刪除失敗:', error);
            alert('刪除失敗，請重試');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800">部門管理</h2>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                >
                    <Icon path={paths.plus} size={16} />
                    新增部門
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">部門名稱</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">代碼</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">狀態</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {teams.map((team) => (
                            <tr key={team.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-600">{team.id}</td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-800">{team.teamName}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        {team.deptCode}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {team.isActive ? (
                                        <span className="text-green-600">✓ 啟用</span>
                                    ) : (
                                        <span className="text-slate-400">停用</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(team)}
                                            className="text-indigo-600 hover:text-indigo-800"
                                            title="編輯"
                                        >
                                            <Icon path={paths.edit} size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(team)}
                                            className="text-red-600 hover:text-red-800"
                                            title="刪除"
                                        >
                                            <Icon path={paths.trash} size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingItem ? '編輯部門' : '新增部門'}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        部門名稱 *
                                    </label>
                                    <input
                                        type="text"
                                        name="teamName"
                                        defaultValue={editingItem?.teamName}
                                        required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        部門代碼 *
                                    </label>
                                    <input
                                        type="text"
                                        name="deptCode"
                                        defaultValue={editingItem?.deptCode}
                                        required
                                        maxLength={4}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">2-4個大寫字母</p>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        id="teamActive"
                                        defaultChecked={editingItem?.isActive !== false}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                                    />
                                    <label htmlFor="teamActive" className="ml-2 text-sm text-slate-700">
                                        啟用
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    儲存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold mb-2">確認刪除</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            確定要刪除「{deleteConfirm.teamName}」嗎？此操作無法撤銷。
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                刪除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



// ===== ProjectsManager 組件 =====
const ProjectsManager = ({ projects, onReload }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (project) => {
        setEditingItem(project);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const projectData = {
            projectName: formData.get('projectName'),
            status: formData.get('status'),
            description: formData.get('description') || ''
        };

        if (editingItem) {
            projectData.id = editingItem.id;
        }

        try {
            const action = editingItem ? 'updateProject' : 'addProject';
            await window.callApi(action, projectData);

            console.log(`✅ ${editingItem ? '更新' : '新增'} Project 成功`);
            setIsModalOpen(false);
            setTimeout(() => onReload(), 1000);
        } catch (error) {
            console.error('❌ 儲存失敗:', error);
            alert('儲存失敗，請重試');
        }
    };

    const handleDelete = async (id) => {
        try {
            await window.callApi('deleteProject', { id });

            console.log('✅ 刪除 Project 成功');
            setDeleteConfirm(null);
            setTimeout(() => onReload(), 1000);
        } catch (error) {
            console.error('❌ 刪除失敗:', error);
            alert('刪除失敗，請重試');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800">專案管理</h2>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                >
                    <Icon path={paths.plus} size={16} />
                    新增專案
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">專案名稱</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">狀態</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">說明</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {projects.map((project) => (
                            <tr key={project.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-600">{project.id}</td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-800">{project.projectName}</td>
                                <td className="px-4 py-3 text-sm">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${project.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {project.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{project.description || '-'}</td>
                                <td className="px-4 py-3 text-sm">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(project)}
                                            className="text-indigo-600 hover:text-indigo-800"
                                            title="編輯"
                                        >
                                            <Icon path={paths.edit} size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(project)}
                                            className="text-red-600 hover:text-red-800"
                                            title="刪除"
                                        >
                                            <Icon path={paths.trash} size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingItem ? '編輯專案' : '新增專案'}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        專案名稱 *
                                    </label>
                                    <input
                                        type="text"
                                        name="projectName"
                                        defaultValue={editingItem?.projectName}
                                        required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        狀態
                                    </label>
                                    <select
                                        name="status"
                                        defaultValue={editingItem?.status || 'Active'}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Completed">Completed</option>
                                        <option value="On Hold">On Hold</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        說明
                                    </label>
                                    <textarea
                                        name="description"
                                        defaultValue={editingItem?.description}
                                        rows="3"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    儲存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold mb-2">確認刪除</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            確定要刪除「{deleteConfirm.projectName}」嗎？此操作無法撤銷。
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                刪除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== OwnersManager 組件 =====
const OwnersManager = ({ owners, onReload }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const handleAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const handleEdit = (owner) => {
        setEditingItem(owner);
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const ownerData = {
            ownerName: formData.get('ownerName'),
            email: formData.get('email') || '',
            isActive: formData.get('isActive') === 'on'
        };

        if (editingItem) {
            ownerData.id = editingItem.id;
        }

        try {
            const action = editingItem ? 'updateOwner' : 'addOwner';
            await window.callApi(action, ownerData);

            console.log(`✅ ${editingItem ? '更新' : '新增'} Owner 成功`);
            setIsModalOpen(false);
            setTimeout(() => onReload(), 1000);
        } catch (error) {
            console.error('❌ 儲存失敗:', error);
            alert('儲存失敗，請重試');
        }
    };

    const handleDelete = async (id) => {
        try {
            await window.callApi('deleteOwner', { id });

            console.log('✅ 刪除 Owner 成功');
            setDeleteConfirm(null);
            setTimeout(() => onReload(), 1000);
        } catch (error) {
            console.error('❌ 刪除失敗:', error);
            alert('刪除失敗，請重試');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800">負責人管理</h2>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                >
                    <Icon path={paths.plus} size={16} />
                    新增負責人
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">姓名</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">狀態</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {owners.map((owner) => (
                            <tr key={owner.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-600">{owner.id}</td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-800">{owner.ownerName}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{owner.email || '-'}</td>
                                <td className="px-4 py-3 text-sm">
                                    {owner.isActive ? (
                                        <span className="text-green-600">✓ 啟用</span>
                                    ) : (
                                        <span className="text-slate-400">停用</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(owner)}
                                            className="text-indigo-600 hover:text-indigo-800"
                                            title="編輯"
                                        >
                                            <Icon path={paths.edit} size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(owner)}
                                            className="text-red-600 hover:text-red-800"
                                            title="刪除"
                                        >
                                            <Icon path={paths.trash} size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {editingItem ? '編輯負責人' : '新增負責人'}
                        </h3>
                        <form onSubmit={handleSave}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        姓名 *
                                    </label>
                                    <input
                                        type="text"
                                        name="ownerName"
                                        defaultValue={editingItem?.ownerName}
                                        required
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        defaultValue={editingItem?.email}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        id="ownerActive"
                                        defaultChecked={editingItem?.isActive !== false}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                                    />
                                    <label htmlFor="ownerActive" className="ml-2 text-sm text-slate-700">
                                        啟用
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    儲存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold mb-2">確認刪除</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            確定要刪除「{deleteConfirm.ownerName}」嗎？此操作無法撤銷。
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                刪除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.SettingsView = SettingsView;
