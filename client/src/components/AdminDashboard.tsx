import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { 
  User, 
  Student, 
  Lecturer,
  Thesis, 
  CreateThesisInput,
  UpdateThesisInput,
  ThesisStatus,
  UserRole 
} from '../../../server/src/schema';

interface AdminDashboardProps {
  user: User;
}

interface StudentWithUser extends Student {
  user?: User | null;
}

interface LecturerWithUser extends Lecturer {
  user?: User | null;
}

interface ThesisWithDetails extends Thesis {
  student?: Student | null;
  lecturers?: Lecturer[] | null;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [students, setStudents] = useState<StudentWithUser[]>([]);
  const [lecturers, setLecturers] = useState<LecturerWithUser[]>([]);
  const [theses, setTheses] = useState<ThesisWithDetails[]>([]);
  const [selectedThesis, setSelectedThesis] = useState<ThesisWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Forms
  const [thesisData, setThesisData] = useState<CreateThesisInput>({
    student_id: 0,
    title: '',
    description: null,
    status: 'PROPOSAL',
    lecturer_ids: []
  });

  const [updateThesisData, setUpdateThesisData] = useState<UpdateThesisInput>({
    id: 0,
    title: '',
    description: null,
    status: 'PROPOSAL'
  });

  const [showCreateThesisDialog, setShowCreateThesisDialog] = useState(false);
  const [showUpdateThesisDialog, setShowUpdateThesisDialog] = useState(false);
  const [showDeleteThesisDialog, setShowDeleteThesisDialog] = useState(false);

  // Load all data
  const loadStudents = useCallback(async () => {
    try {
      const result = await trpc.getStudents.query();
      setStudents(result);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  }, []);

  const loadLecturers = useCallback(async () => {
    try {
      const result = await trpc.getLecturers.query();
      setLecturers(result);
    } catch (error) {
      console.error('Failed to load lecturers:', error);
    }
  }, []);

  const loadTheses = useCallback(async () => {
    try {
      const result = await trpc.getAllTheses.query();
      
      // Load additional details for each thesis
      const thesesWithDetails = await Promise.all(
        result.map(async (thesis: Thesis) => {
          try {
            const student = await trpc.getStudentById.query({ id: thesis.student_id });
            return { ...thesis, student } as ThesisWithDetails;
          } catch (error) {
            console.error('Failed to load student for thesis:', thesis.id);
            return { ...thesis, student: null } as ThesisWithDetails;
          }
        })
      );
      
      setTheses(thesesWithDetails);
    } catch (error) {
      console.error('Failed to load theses:', error);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    loadLecturers();
    loadTheses();
  }, [loadStudents, loadLecturers, loadTheses]);

  // Handle create thesis
  const handleCreateThesis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createThesis.mutate(thesisData);
      await loadTheses();
      setShowCreateThesisDialog(false);
      setThesisData({
        student_id: 0,
        title: '',
        description: null,
        status: 'PROPOSAL',
        lecturer_ids: []
      });
    } catch (error) {
      console.error('Failed to create thesis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle update thesis
  const handleUpdateThesis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.updateThesis.mutate(updateThesisData);
      await loadTheses();
      setShowUpdateThesisDialog(false);
      setSelectedThesis(null);
    } catch (error) {
      console.error('Failed to update thesis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete thesis
  const handleDeleteThesis = async () => {
    if (!selectedThesis) return;
    
    setIsLoading(true);
    try {
      await trpc.deleteThesis.mutate({ id: selectedThesis.id });
      await loadTheses();
      setShowDeleteThesisDialog(false);
      setSelectedThesis(null);
    } catch (error) {
      console.error('Failed to delete thesis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle lecturer assignment
  const handleLecturerToggle = (lecturerId: number) => {
    setThesisData(prev => ({
      ...prev,
      lecturer_ids: prev.lecturer_ids.includes(lecturerId)
        ? prev.lecturer_ids.filter(id => id !== lecturerId)
        : [...prev.lecturer_ids, lecturerId]
    }));
  };

  const getStatusBadgeColor = (status: ThesisStatus) => {
    switch (status) {
      case 'PROPOSAL': return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'REVISION': return 'bg-orange-100 text-orange-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: ThesisStatus) => {
    switch (status) {
      case 'PROPOSAL': return 'Proposal';
      case 'IN_PROGRESS': return 'Sedang Dikerjakan';
      case 'REVISION': return 'Revisi';
      case 'COMPLETED': return 'Selesai';
      default: return status;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-100 text-blue-800';
      case 'LECTURER': return 'bg-green-100 text-green-800';
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'STUDENT': return 'Mahasiswa';
      case 'LECTURER': return 'Dosen Pembimbing';
      case 'ADMIN': return 'Administrator';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Administrator</h2>
          <p className="text-gray-600">Kelola sistem bimbingan skripsi</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Mahasiswa</TabsTrigger>
          <TabsTrigger value="lecturers">Dosen</TabsTrigger>
          <TabsTrigger value="theses">Skripsi</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Mahasiswa</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                <p className="text-xs text-gray-500 mt-1">Mahasiswa terdaftar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Dosen</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-green-600">{lecturers.length}</div>
                <p className="text-xs text-gray-500 mt-1">Dosen pembimbing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Skripsi</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-purple-600">{theses.length}</div>
                <p className="text-xs text-gray-500 mt-1">Skripsi terdaftar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Selesai</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-emerald-600">
                  {theses.filter(t => t.status === 'COMPLETED').length}
                </div>
                <p className="text-xs text-gray-500 mt-1">Skripsi selesai</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Statistik Status Skripsi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-600">
                    {theses.filter(t => t.status === 'PROPOSAL').length}
                  </p>
                  <p className="text-sm text-gray-500">Proposal</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-600">
                    {theses.filter(t => t.status === 'IN_PROGRESS').length}
                  </p>
                  <p className="text-sm text-gray-500">Sedang Dikerjakan</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-orange-600">
                    {theses.filter(t => t.status === 'REVISION').length}
                  </p>
                  <p className="text-sm text-gray-500">Revisi</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-green-600">
                    {theses.filter(t => t.status === 'COMPLETED').length}
                  </p>
                  <p className="text-sm text-gray-500">Selesai</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Daftar Mahasiswa</h3>
            <p className="text-sm text-gray-500">{students.length} mahasiswa terdaftar</p>
          </div>

          {students.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Belum ada mahasiswa yang terdaftar</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {students.map((student: StudentWithUser) => (
                <Card key={student.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-lg">{student.full_name}</h4>
                          <Badge variant="outline">{student.student_id}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <p>📧 {student.user?.email || 'Email tidak tersedia'}</p>
                          <p>📱 {student.phone || 'Telepon tidak tersedia'}</p>
                          {student.address && (
                            <p className="md:col-span-2">🏠 {student.address}</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Terdaftar: {student.created_at.toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lecturers" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Daftar Dosen Pembimbing</h3>
            <p className="text-sm text-gray-500">{lecturers.length} dosen terdaftar</p>
          </div>

          {lecturers.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Belum ada dosen yang terdaftar</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {lecturers.map((lecturer: LecturerWithUser) => (
                <Card key={lecturer.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-lg">{lecturer.full_name}</h4>
                          <Badge variant="outline">{lecturer.lecturer_id}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <p>📧 {lecturer.user?.email || 'Email tidak tersedia'}</p>
                          <p>📱 {lecturer.phone || 'Telepon tidak tersedia'}</p>
                          {lecturer.specialization && (
                            <p className="md:col-span-2">🎓 {lecturer.specialization}</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Terdaftar: {lecturer.created_at.toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="theses" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Manajemen Skripsi</h3>
            <Dialog open={showCreateThesisDialog} onOpenChange={setShowCreateThesisDialog}>
              <DialogTrigger asChild>
                <Button>Tambah Skripsi Baru</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Tambah Skripsi Baru</DialogTitle>
                  <DialogDescription>
                    Daftarkan skripsi baru untuk mahasiswa
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateThesis} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mahasiswa</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={thesisData.student_id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setThesisData((prev: CreateThesisInput) => ({ 
                          ...prev, 
                          student_id: parseInt(e.target.value) || 0 
                        }))
                      }
                      required
                    >
                      <option value="">Pilih Mahasiswa</option>
                      {students.map((student: StudentWithUser) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name} ({student.student_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Judul Skripsi</label>
                    <Input
                      placeholder="Masukkan judul skripsi"
                      value={thesisData.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setThesisData((prev: CreateThesisInput) => ({ 
                          ...prev, 
                          title: e.target.value 
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deskripsi (Opsional)</label>
                    <Textarea
                      placeholder="Deskripsi tentang skripsi"
                      value={thesisData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setThesisData((prev: CreateThesisInput) => ({ 
                          ...prev, 
                          description: e.target.value || null 
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={thesisData.status || 'PROPOSAL'}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setThesisData((prev: CreateThesisInput) => ({ 
                          ...prev, 
                          status: e.target.value as ThesisStatus 
                        }))
                      }
                    >
                      <option value="PROPOSAL">Proposal</option>
                      <option value="IN_PROGRESS">Sedang Dikerjakan</option>
                      <option value="REVISION">Revisi</option>
                      <option value="COMPLETED">Selesai</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dosen Pembimbing (Pilih minimal 1)</label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                      {lecturers.map((lecturer: LecturerWithUser) => (
                        <label key={lecturer.id} className="flex items-center space-x-2 p-1">
                          <input
                            type="checkbox"
                            checked={thesisData.lecturer_ids.includes(lecturer.id)}
                            onChange={() => handleLecturerToggle(lecturer.id)}
                          />
                          <span className="text-sm">
                            {lecturer.full_name} ({lecturer.lecturer_id})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateThesisDialog(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={isLoading || thesisData.lecturer_ids.length === 0}>
                      {isLoading ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {theses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Belum ada skripsi yang terdaftar</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {theses.map((thesis: ThesisWithDetails) => (
                <Card key={thesis.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-lg">{thesis.title}</h4>
                            <p className="text-gray-600">
                              Mahasiswa: {thesis.student?.full_name || 'Nama tidak tersedia'} ({thesis.student?.student_id || 'NIM tidak tersedia'})
                            </p>
                          </div>
                          <Badge className={getStatusBadgeColor(thesis.status)}>
                            {getStatusDisplayName(thesis.status)}
                          </Badge>
                        </div>
                        
                        {thesis.description && (
                          <p className="text-gray-600 text-sm mb-2">{thesis.description}</p>
                        )}
                        
                        <p className="text-xs text-gray-400">
                          Dibuat: {thesis.created_at.toLocaleDateString('id-ID')} | 
                          Terakhir diupdate: {thesis.updated_at.toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedThesis(thesis);
                          setUpdateThesisData({
                            id: thesis.id,
                            title: thesis.title,
                            description: thesis.description,
                            status: thesis.status
                          });
                          setShowUpdateThesisDialog(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          setSelectedThesis(thesis);
                          setShowDeleteThesisDialog(true);
                        }}
                      >
                        Hapus
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Update Thesis Dialog */}
          <Dialog open={showUpdateThesisDialog} onOpenChange={setShowUpdateThesisDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Skripsi</DialogTitle>
                <DialogDescription>
                  Ubah informasi skripsi
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateThesis} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Judul Skripsi</label>
                  <Input
                    value={updateThesisData.title || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUpdateThesisData((prev: UpdateThesisInput) => ({ 
                        ...prev, 
                        title: e.target.value 
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Deskripsi</label>
                  <Textarea
                    value={updateThesisData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setUpdateThesisData((prev: UpdateThesisInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={updateThesisData.status || 'PROPOSAL'}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setUpdateThesisData((prev: UpdateThesisInput) => ({ 
                        ...prev, 
                        status: e.target.value as ThesisStatus 
                      }))
                    }
                  >
                    <option value="PROPOSAL">Proposal</option>
                    <option value="IN_PROGRESS">Sedang Dikerjakan</option>
                    <option value="REVISION">Revisi</option>
                    <option value="COMPLETED">Selesai</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowUpdateThesisDialog(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Thesis Dialog */}
          <AlertDialog open={showDeleteThesisDialog} onOpenChange={setShowDeleteThesisDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Skripsi</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin ingin menghapus skripsi "{selectedThesis?.title}"? 
                  Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteThesis}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Menghapus...' : 'Hapus'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}