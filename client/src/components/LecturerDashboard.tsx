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
  Lecturer, 
  Thesis, 
  GuidanceSession, 
  Submission, 
  Comment, 
  Student,
  CreateLecturerInput,
  CreateCommentInput,
  ThesisStatus 
} from '../../../server/src/schema';

interface LecturerDashboardProps {
  user: User;
}

interface ThesisWithStudent extends Thesis {
  student?: Student | null;
}

export function LecturerDashboard({ user }: LecturerDashboardProps) {
  const [lecturer, setLecturer] = useState<Lecturer | null>(null);
  const [theses, setTheses] = useState<ThesisWithStudent[]>([]);
  const [selectedThesis, setSelectedThesis] = useState<ThesisWithStudent | null>(null);
  const [guidanceSessions, setGuidanceSessions] = useState<GuidanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<GuidanceSession | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile completion form
  const [profileData, setProfileData] = useState<CreateLecturerInput>({
    user_id: user.id,
    lecturer_id: '',
    full_name: '',
    phone: null,
    specialization: null
  });

  // New comment form
  const [commentData, setCommentData] = useState<CreateCommentInput>({
    guidance_session_id: 0,
    submission_id: null,
    sender_id: user.id,
    receiver_id: null,
    content: '',
    comment_type: 'GENERAL'
  });

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showAccFinalDialog, setShowAccFinalDialog] = useState(false);

  // Load lecturer profile
  const loadLecturer = useCallback(async () => {
    try {
      const result = await trpc.getLecturerByUserId.query({ userId: user.id });
      setLecturer(result);
      if (result) {
        await loadTheses(result.id);
      }
    } catch (error) {
      console.error('Failed to load lecturer profile:', error);
    }
  }, [user.id]);

  // Load lecturer's supervised theses
  const loadTheses = useCallback(async (lecturerId: number) => {
    try {
      const result = await trpc.getThesesByLecturer.query({ lecturer_id: lecturerId });
      
      // Load student details for each thesis
      const thesesWithStudents = await Promise.all(
        result.map(async (thesis: Thesis) => {
          try {
            const student = await trpc.getStudentById.query({ id: thesis.student_id });
            return { ...thesis, student } as ThesisWithStudent;
          } catch (error) {
            console.error('Failed to load student for thesis:', thesis.id);
            return { ...thesis, student: null } as ThesisWithStudent;
          }
        })
      );
      
      setTheses(thesesWithStudents);
    } catch (error) {
      console.error('Failed to load theses:', error);
    }
  }, []);

  // Load guidance sessions for a thesis
  const loadGuidanceSessions = useCallback(async (thesisId: number) => {
    try {
      const result = await trpc.getGuidanceSessionsByThesis.query({ thesis_id: thesisId });
      setGuidanceSessions(result);
    } catch (error) {
      console.error('Failed to load guidance sessions:', error);
    }
  }, []);

  // Load submissions for a session
  const loadSubmissions = useCallback(async (sessionId: number) => {
    try {
      const result = await trpc.getSubmissionsBySession.query({ sessionId });
      setSubmissions(result);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  }, []);

  // Load comments for a session
  const loadComments = useCallback(async (sessionId: number) => {
    try {
      const result = await trpc.getCommentsBySession.query({ guidance_session_id: sessionId });
      setComments(result);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }, []);

  useEffect(() => {
    loadLecturer();
  }, [loadLecturer]);

  // Handle profile completion
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await trpc.createLecturer.mutate(profileData);
      setLecturer(result);
      setShowProfileDialog(false);
      setProfileData({
        user_id: user.id,
        lecturer_id: '',
        full_name: '',
        phone: null,
        specialization: null
      });
    } catch (error) {
      console.error('Failed to complete profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle send comment
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !commentData.content.trim()) return;
    
    setIsLoading(true);
    try {
      const result = await trpc.createComment.mutate({
        ...commentData,
        guidance_session_id: selectedSession.id
      });
      await loadComments(selectedSession.id);
      setCommentData(prev => ({ ...prev, content: '' }));
    } catch (error) {
      console.error('Failed to send comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle update session notes
  const handleUpdateSessionNotes = async (sessionId: number, notes: string) => {
    try {
      await trpc.updateGuidanceSession.mutate({ id: sessionId, notes });
      await loadGuidanceSessions(selectedThesis!.id);
    } catch (error) {
      console.error('Failed to update session notes:', error);
    }
  };

  // Handle start thesis (change status from PROPOSAL to IN_PROGRESS)
  const handleStartThesis = async (thesisId: number) => {
    if (!lecturer) return;
    
    setIsLoading(true);
    try {
      await trpc.updateThesis.mutate({
        id: thesisId,
        status: 'IN_PROGRESS'
      });
      await loadTheses(lecturer.id);
      // Update selectedThesis if it's the same thesis
      if (selectedThesis && selectedThesis.id === thesisId) {
        setSelectedThesis(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
      }
    } catch (error) {
      console.error('Failed to start thesis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle complete thesis (change status to COMPLETED)
  const handleCompleteThesis = async (thesisId: number) => {
    if (!lecturer) return;
    
    setIsLoading(true);
    try {
      await trpc.updateThesis.mutate({
        id: thesisId,
        status: 'COMPLETED'
      });
      await loadTheses(lecturer.id);
      setShowAccFinalDialog(false);
      // Update selectedThesis if it's the same thesis
      if (selectedThesis && selectedThesis.id === thesisId) {
        setSelectedThesis(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
      }
    } catch (error) {
      console.error('Failed to complete thesis:', error);
    } finally {
      setIsLoading(false);
    }
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

  // Show profile completion if lecturer profile doesn't exist
  if (!lecturer) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Lengkapi Profil Dosen</CardTitle>
            <CardDescription>
              Silakan lengkapi profil Anda untuk menggunakan sistem bimbingan skripsi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">NIDN/NIP</label>
                <Input
                  placeholder="Masukkan NIDN/NIP"
                  value={profileData.lecturer_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData((prev: CreateLecturerInput) => ({ ...prev, lecturer_id: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Lengkap</label>
                <Input
                  placeholder="Masukkan nama lengkap"
                  value={profileData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData((prev: CreateLecturerInput) => ({ ...prev, full_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nomor Telepon (Opsional)</label>
                <Input
                  placeholder="Masukkan nomor telepon"
                  value={profileData.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData((prev: CreateLecturerInput) => ({ 
                      ...prev, 
                      phone: e.target.value || null 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Spesialisasi (Opsional)</label>
                <Input
                  placeholder="contoh: Kebidanan Komunitas, Kesehatan Reproduksi"
                  value={profileData.specialization || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData((prev: CreateLecturerInput) => ({ 
                      ...prev, 
                      specialization: e.target.value || null 
                    }))
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Dosen Pembimbing</h2>
          <p className="text-gray-600">Selamat datang, {lecturer.full_name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">NIDN: {lecturer.lecturer_id}</p>
          <p className="text-sm text-gray-500">Email: {user.email}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="students">Mahasiswa Bimbingan</TabsTrigger>
          <TabsTrigger value="guidance">Bimbingan</TabsTrigger>
          <TabsTrigger value="reports">Laporan</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Nama Lengkap</p>
                  <p className="text-lg">{lecturer.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">NIDN/NIP</p>
                  <p className="text-lg">{lecturer.lecturer_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-lg">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Nomor Telepon</p>
                  <p className="text-lg">{lecturer.phone || 'Tidak tersedia'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Spesialisasi</p>
                  <p className="text-lg">{lecturer.specialization || 'Tidak tersedia'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistik Bimbingan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{theses.length}</p>
                  <p className="text-sm text-gray-500">Total Mahasiswa</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {theses.filter(t => t.status === 'COMPLETED').length}
                  </p>
                  <p className="text-sm text-gray-500">Selesai</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {theses.filter(t => t.status === 'IN_PROGRESS').length}
                  </p>
                  <p className="text-sm text-gray-500">Sedang Dikerjakan</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {theses.filter(t => t.status === 'PROPOSAL').length}
                  </p>
                  <p className="text-sm text-gray-500">Proposal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Mahasiswa Bimbingan</h3>
            <p className="text-sm text-gray-500">{theses.length} mahasiswa terdaftar</p>
          </div>
          
          {theses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Belum ada mahasiswa bimbingan</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Mahasiswa akan muncul setelah ditugaskan oleh administrator
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {theses.map((thesis: ThesisWithStudent) => (
                <Card 
                  key={thesis.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedThesis?.id === thesis.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedThesis(thesis);
                    loadGuidanceSessions(thesis.id);
                    setActiveTab('guidance');
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-lg">{thesis.student?.full_name || 'Nama tidak tersedia'}</h4>
                          <Badge variant="outline">
                            {thesis.student?.student_id || 'NIM tidak tersedia'}
                          </Badge>
                        </div>
                        <h5 className="text-md font-medium text-gray-800 mb-1">{thesis.title}</h5>
                        {thesis.description && (
                          <p className="text-gray-600 text-sm">{thesis.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Mulai: {thesis.created_at.toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <Badge className={getStatusBadgeColor(thesis.status)}>
                        {getStatusDisplayName(thesis.status)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="guidance" className="space-y-4">
          {!selectedThesis ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Pilih mahasiswa terlebih dahulu dari tab Mahasiswa Bimbingan</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Bimbingan: {selectedThesis.student?.full_name} - {selectedThesis.title}
                  </h3>
                  <Badge className={getStatusBadgeColor(selectedThesis.status)}>
                    {getStatusDisplayName(selectedThesis.status)}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  {selectedThesis.status === 'PROPOSAL' && (
                    <Button 
                      onClick={() => handleStartThesis(selectedThesis.id)}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? 'Memproses...' : 'Mulai Bimbingan'}
                    </Button>
                  )}
                  {selectedThesis.status !== 'COMPLETED' && (
                    <AlertDialog open={showAccFinalDialog} onOpenChange={setShowAccFinalDialog}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Acc Final
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Konfirmasi Penyelesaian Skripsi</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menyelesaikan bimbingan skripsi ini? Tindakan ini akan menandai skripsi sebagai selesai.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isLoading}>
                            Batal
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleCompleteThesis(selectedThesis.id)}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isLoading ? 'Memproses...' : 'Ya, Selesaikan'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              {guidanceSessions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-gray-500">Belum ada sesi bimbingan</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Mahasiswa perlu membuat sesi bimbingan terlebih dahulu
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {guidanceSessions.map((session: GuidanceSession) => (
                    <Card 
                      key={session.id}
                      className={`cursor-pointer transition-colors ${
                        selectedSession?.id === session.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setSelectedSession(session);
                        loadSubmissions(session.id);
                        loadComments(session.id);
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">
                              Sesi {session.session_date.toLocaleDateString('id-ID')}
                            </h4>
                            {session.notes && (
                              <p className="text-gray-600 mt-1">{session.notes}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              Dibuat: {session.created_at.toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Session Detail */}
              {selectedSession && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>
                      Detail Sesi - {selectedSession.session_date.toLocaleDateString('id-ID')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Session Notes */}
                    <div>
                      <h4 className="font-medium mb-2">Catatan Sesi</h4>
                      <Textarea
                        placeholder="Tambahkan catatan untuk sesi ini..."
                        defaultValue={selectedSession.notes || ''}
                        onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                          if (e.target.value !== selectedSession.notes) {
                            handleUpdateSessionNotes(selectedSession.id, e.target.value);
                          }
                        }}
                        className="min-h-20"
                      />
                    </div>

                    {/* Submissions */}
                    <div>
                      <h4 className="font-medium mb-2">File dari Mahasiswa</h4>
                      {submissions.length === 0 ? (
                        <p className="text-sm text-gray-500">Belum ada file yang diunggah mahasiswa</p>
                      ) : (
                        <div className="space-y-2">
                          {submissions.map((submission: Submission) => (
                            <div 
                              key={submission.id} 
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                            >
                              <div>
                                <p className="font-medium">{submission.file_name}</p>
                                {submission.description && (
                                  <p className="text-sm text-gray-600">{submission.description}</p>
                                )}
                                <p className="text-xs text-gray-400">
                                  Diunggah: {submission.created_at.toLocaleDateString('id-ID')} | 
                                  Ukuran: {(submission.file_size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  📎 Unduh
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setCommentData(prev => ({
                                      ...prev,
                                      submission_id: submission.id,
                                      comment_type: 'FILE_COMMENT'
                                    }));
                                  }}
                                >
                                  💬 Komentari
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Comments */}
                    <div>
                      <h4 className="font-medium mb-2">Komunikasi</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                        {comments.map((comment: Comment) => (
                          <div 
                            key={comment.id} 
                            className={`p-3 rounded-md ${
                              comment.sender_id === user.id 
                                ? 'bg-green-100 ml-8' 
                                : 'bg-blue-100 mr-8'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm">{comment.content}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {comment.created_at.toLocaleDateString('id-ID')} {comment.created_at.toLocaleTimeString('id-ID')}
                                  {comment.comment_type === 'FILE_COMMENT' && (
                                    <span className="ml-2 text-blue-600">📎 Komentar file</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <form onSubmit={handleSendComment} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <label className="text-xs">
                            <input
                              type="radio"
                              name="commentType"
                              value="GENERAL"
                              checked={commentData.comment_type === 'GENERAL'}
                              onChange={() => setCommentData(prev => ({ 
                                ...prev, 
                                comment_type: 'GENERAL',
                                submission_id: null
                              }))}
                              className="mr-1"
                            />
                            Pesan Umum
                          </label>
                          <label className="text-xs">
                            <input
                              type="radio"
                              name="commentType"
                              value="FILE_COMMENT"
                              checked={commentData.comment_type === 'FILE_COMMENT'}
                              onChange={() => setCommentData(prev => ({ 
                                ...prev, 
                                comment_type: 'FILE_COMMENT'
                              }))}
                              className="mr-1"
                              disabled={submissions.length === 0}
                            />
                            Komentar File
                          </label>
                        </div>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Tulis balasan..."
                            value={commentData.content}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCommentData((prev: CreateCommentInput) => ({ 
                                ...prev, 
                                content: e.target.value 
                              }))
                            }
                            className="flex-1"
                          />
                          <Button type="submit" disabled={isLoading || !commentData.content.trim()}>
                            Kirim
                          </Button>
                        </div>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Bimbingan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">Fitur laporan akan segera tersedia</p>
                <p className="text-sm text-gray-400 mt-2">
                  Akan menampilkan progress mahasiswa, statistik bimbingan, dan laporan aktivitas
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}