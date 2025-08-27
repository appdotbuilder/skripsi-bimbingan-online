import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { 
  User, 
  Student, 
  Thesis, 
  GuidanceSession, 
  Submission, 
  Comment,
  CreateStudentInput,
  CreateGuidanceSessionInput,
  CreateSubmissionInput,
  CreateCommentInput,
  ThesisStatus 
} from '../../../server/src/schema';

interface StudentDashboardProps {
  user: User;
}

export function StudentDashboard({ user }: StudentDashboardProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [selectedThesis, setSelectedThesis] = useState<Thesis | null>(null);
  const [guidanceSessions, setGuidanceSessions] = useState<GuidanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<GuidanceSession | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile completion form
  const [profileData, setProfileData] = useState<CreateStudentInput>({
    user_id: user.id,
    student_id: '',
    full_name: '',
    phone: null,
    address: null
  });

  // New session form
  const [sessionData, setSessionData] = useState<CreateGuidanceSessionInput>({
    thesis_id: 0,
    notes: null
  });

  // New submission form
  const [submissionData, setSubmissionData] = useState<CreateSubmissionInput>({
    guidance_session_id: 0,
    file_name: '',
    file_path: '',
    file_size: 0,
    uploaded_by: user.id,
    description: null
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
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);

  // Load student profile
  const loadStudent = useCallback(async () => {
    try {
      const result = await trpc.getStudentByUserId.query({ userId: user.id });
      setStudent(result);
      if (result) {
        await loadTheses(result.id);
      }
    } catch (error) {
      console.error('Failed to load student profile:', error);
    }
  }, [user.id]);

  // Load student's theses
  const loadTheses = useCallback(async (studentId: number) => {
    try {
      const result = await trpc.getThesesByStudent.query({ student_id: studentId });
      setTheses(result);
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
    loadStudent();
  }, [loadStudent]);

  // Handle profile completion
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await trpc.createStudent.mutate(profileData);
      setStudent(result);
      setShowProfileDialog(false);
      setProfileData({
        user_id: user.id,
        student_id: '',
        full_name: '',
        phone: null,
        address: null
      });
    } catch (error) {
      console.error('Failed to complete profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle create guidance session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThesis) return;
    
    setIsLoading(true);
    try {
      const result = await trpc.createGuidanceSession.mutate({
        ...sessionData,
        thesis_id: selectedThesis.id
      });
      await loadGuidanceSessions(selectedThesis.id);
      setShowSessionDialog(false);
      setSessionData({
        thesis_id: 0,
        notes: null
      });
    } catch (error) {
      console.error('Failed to create guidance session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file submission (stub implementation for demo)
  const handleSubmitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    
    setIsLoading(true);
    try {
      // Stub: In real implementation, this would handle file upload
      const stubSubmission: CreateSubmissionInput = {
        guidance_session_id: selectedSession.id,
        file_name: submissionData.file_name,
        file_path: `/uploads/${submissionData.file_name}`, // Stub path
        file_size: Math.floor(Math.random() * 1000000), // Stub size
        uploaded_by: user.id,
        description: submissionData.description
      };
      
      const result = await trpc.createSubmission.mutate(stubSubmission);
      await loadSubmissions(selectedSession.id);
      setShowSubmissionDialog(false);
      setSubmissionData({
        guidance_session_id: 0,
        file_name: '',
        file_path: '',
        file_size: 0,
        uploaded_by: user.id,
        description: null
      });
    } catch (error) {
      console.error('Failed to submit file:', error);
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

  // Show profile completion if student profile doesn't exist
  if (!student) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Lengkapi Profil Mahasiswa</CardTitle>
            <CardDescription>
              Silakan lengkapi profil Anda untuk menggunakan sistem bimbingan skripsi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">NIM</label>
                <Input
                  placeholder="Masukkan NIM"
                  value={profileData.student_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData((prev: CreateStudentInput) => ({ ...prev, student_id: e.target.value }))
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
                    setProfileData((prev: CreateStudentInput) => ({ ...prev, full_name: e.target.value }))
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
                    setProfileData((prev: CreateStudentInput) => ({ 
                      ...prev, 
                      phone: e.target.value || null 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Alamat (Opsional)</label>
                <Textarea
                  placeholder="Masukkan alamat"
                  value={profileData.address || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setProfileData((prev: CreateStudentInput) => ({ 
                      ...prev, 
                      address: e.target.value || null 
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
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Mahasiswa</h2>
          <p className="text-gray-600">Selamat datang, {student.full_name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">NIM: {student.student_id}</p>
          <p className="text-sm text-gray-500">Email: {user.email}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="thesis">Skripsi</TabsTrigger>
          <TabsTrigger value="guidance">Bimbingan</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
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
                  <p className="text-lg">{student.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">NIM</p>
                  <p className="text-lg">{student.student_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-lg">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Nomor Telepon</p>
                  <p className="text-lg">{student.phone || 'Tidak tersedia'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Alamat</p>
                  <p className="text-lg">{student.address || 'Tidak tersedia'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thesis" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Daftar Skripsi</h3>
          </div>
          
          {theses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">Belum ada skripsi yang terdaftar</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Hubungi administrator untuk mendaftarkan skripsi Anda
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {theses.map((thesis: Thesis) => (
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
                        <h4 className="font-semibold text-lg">{thesis.title}</h4>
                        {thesis.description && (
                          <p className="text-gray-600 mt-1">{thesis.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Dibuat: {thesis.created_at.toLocaleDateString('id-ID')}
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
                  <p className="text-gray-500">Pilih skripsi terlebih dahulu dari tab Skripsi</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Bimbingan: {selectedThesis.title}</h3>
                  <Badge className={getStatusBadgeColor(selectedThesis.status)}>
                    {getStatusDisplayName(selectedThesis.status)}
                  </Badge>
                </div>
                <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
                  <DialogTrigger asChild>
                    <Button>Buat Sesi Bimbingan Baru</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Buat Sesi Bimbingan Baru</DialogTitle>
                      <DialogDescription>
                        Buat sesi bimbingan baru untuk skripsi Anda
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSession} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Catatan Awal (Opsional)</label>
                        <Textarea
                          placeholder="Masukkan catatan atau pertanyaan untuk sesi ini"
                          value={sessionData.notes || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setSessionData((prev: CreateGuidanceSessionInput) => ({ 
                              ...prev, 
                              notes: e.target.value || null 
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowSessionDialog(false)}>
                          Batal
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Membuat...' : 'Buat Sesi'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {guidanceSessions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-gray-500">Belum ada sesi bimbingan</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Buat sesi bimbingan baru untuk memulai
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
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        Detail Sesi - {selectedSession.session_date.toLocaleDateString('id-ID')}
                      </CardTitle>
                      <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">Unggah File</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Unggah File Skripsi</DialogTitle>
                            <DialogDescription>
                              Unggah file skripsi untuk sesi bimbingan ini
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleSubmitFile} className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Nama File</label>
                              <Input
                                placeholder="contoh: BAB1-Pendahuluan.pdf"
                                value={submissionData.file_name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setSubmissionData((prev: CreateSubmissionInput) => ({ 
                                    ...prev, 
                                    file_name: e.target.value 
                                  }))
                                }
                                required
                              />
                              <p className="text-xs text-gray-500">
                                *Stub: File upload belum diimplementasi - hanya simulasi
                              </p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Deskripsi (Opsional)</label>
                              <Textarea
                                placeholder="Deskripsi tentang file yang diunggah"
                                value={submissionData.description || ''}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                  setSubmissionData((prev: CreateSubmissionInput) => ({ 
                                    ...prev, 
                                    description: e.target.value || null 
                                  }))
                                }
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setShowSubmissionDialog(false)}>
                                Batal
                              </Button>
                              <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Mengunggah...' : 'Unggah'}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Submissions */}
                    <div>
                      <h4 className="font-medium mb-2">File yang Diunggah</h4>
                      {submissions.length === 0 ? (
                        <p className="text-sm text-gray-500">Belum ada file yang diunggah</p>
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
                              <Button variant="outline" size="sm">
                                📎 Unduh
                              </Button>
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
                                ? 'bg-blue-100 ml-8' 
                                : 'bg-gray-100 mr-8'
                            }`}
                          >
                            <p className="text-sm">{comment.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {comment.created_at.toLocaleDateString('id-ID')} {comment.created_at.toLocaleTimeString('id-ID')}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      <form onSubmit={handleSendComment} className="flex space-x-2">
                        <Input
                          placeholder="Tulis pesan..."
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
                      </form>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Aktivitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500">Fitur riwayat akan segera tersedia</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}