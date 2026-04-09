'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  User,
  MapPin,
  Phone,
  Calendar,
  Baby,
  Droplets,
  AlertTriangle,
  FileText,
  Heart,
  Briefcase,
  Users,
  ChevronLeft,
  Loader2,
  Activity,
  Pill,
  ShieldCheck,
  BrainCircuit,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import makatiBarangaysData from '@/data/makati-barangays.json';

// ─── Constants ───────────────────────────────────────────────────────────────

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const NAME_EXTENSIONS = ['', 'Jr.', 'Sr.', 'II', 'III', 'IV'];

const RELIGIONS = [
  'Catholic',
  'Protestant',
  'Islam',
  'Born Again',
  'Iglesia ni Cristo',
  'Seventh-day Adventist',
  'Buddhist',
  'Others',
];

const MARITAL_STATUSES = [
  'Single',
  'Married',
  'Widowed',
  'Separated',
  'Live-in',
];

const INCOME_BRACKETS = [
  'Below Minimum Wage',
  'Minimum Wage',
  'Above Minimum Wage',
  'No Income',
];

// Extract barangay names from the GeoJSON data
const BARANGAYS: string[] = makatiBarangaysData.features
  .map((f) => f.properties.name)
  .sort((a, b) => a.localeCompare(b));

// ─── Types ───────────────────────────────────────────────────────────────────

interface NewPatientFormValues {
  surname: string;
  firstName: string;
  middleInitial: string;
  nameExtension: string;
  dateOfBirth: string;
  bloodType: string;
  address: string;
  barangay: string;
  contactNumber: string;
  emergencyContact: string;
  emergencyRelation: string;
  occupation: string;
  religion: string;
  maritalStatus: string;
  familyComposition: string;
  incomeBracket: string;
  gravidity: string;
  parity: string;
  lmp: string;
  allergies: string;
  medicalHistory: string;
  surgicalHistory: string;
  familyHistory: string;
  obstetricHistory: string;
  immunizationStatus: string;
  currentMedications: string;
  healthPractices: string;
  socialHistory: string;
  psychosocialHistory: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NewPatientView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedPatientId = useAppStore((s) => s.setSelectedPatientId);
  const currentNurse = useAppStore((s) => s.currentNurse);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewPatientFormValues>({
    defaultValues: {
      surname: '',
      firstName: '',
      middleInitial: '',
      nameExtension: '',
      dateOfBirth: '',
      bloodType: '',
      address: '',
      barangay: '',
      contactNumber: '',
      emergencyContact: '',
      emergencyRelation: '',
      occupation: '',
      religion: '',
      maritalStatus: '',
      familyComposition: '',
      incomeBracket: '',
      gravidity: '0',
      parity: '0',
      lmp: '',
      allergies: '',
      medicalHistory: '',
      surgicalHistory: '',
      familyHistory: '',
      obstetricHistory: '',
      immunizationStatus: '',
      currentMedications: '',
      healthPractices: '',
      socialHistory: '',
      psychosocialHistory: '',
    },
  });

  const lmpValue = form.watch('lmp');

  // Calculate AOG from LMP using date-fns
  const calculatedAOG = useMemo(() => {
    if (!lmpValue) return null;
    try {
      const lmpDate = new Date(lmpValue);
      const today = new Date();
      const totalDays = differenceInDays(today, lmpDate);
      if (totalDays < 0) return null;
      const weeks = Math.floor(totalDays / 7);
      const days = totalDays % 7;
      return `${weeks}w ${days}d`;
    } catch {
      return null;
    }
  }, [lmpValue]);

  const onSubmit = async (values: NewPatientFormValues) => {
    if (!currentNurse) {
      toast.error('You must be logged in to add a patient');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nurseId: currentNurse.id,
        surname: values.surname.trim(),
        firstName: values.firstName.trim(),
        middleInitial: values.middleInitial.trim() || null,
        nameExtension: values.nameExtension || null,
        dateOfBirth: values.dateOfBirth,
        address: values.address.trim(),
        barangay: values.barangay || null,
        contactNumber: values.contactNumber.trim() || null,
        emergencyContact: values.emergencyContact.trim() || null,
        emergencyRelation: values.emergencyRelation.trim() || null,
        occupation: values.occupation.trim() || null,
        religion: values.religion || null,
        maritalStatus: values.maritalStatus || null,
        familyComposition: values.familyComposition.trim() || null,
        incomeBracket: values.incomeBracket || null,
        bloodType: values.bloodType || null,
        gravidity: parseInt(values.gravidity, 10) || 0,
        parity: parseInt(values.parity, 10) || 0,
        lmp: values.lmp || null,
        allergies: values.allergies.trim() || null,
        medicalHistory: values.medicalHistory.trim() || null,
        surgicalHistory: values.surgicalHistory.trim() || null,
        familyHistory: values.familyHistory.trim() || null,
        obstetricHistory: values.obstetricHistory.trim() || null,
        immunizationStatus: values.immunizationStatus.trim() || null,
        currentMedications: values.currentMedications.trim() || null,
        healthPractices: values.healthPractices.trim() || null,
        socialHistory: values.socialHistory.trim() || null,
        psychosocialHistory: values.psychosocialHistory.trim() || null,
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Patient ${data.data.name} created successfully!`);
        setSelectedPatientId(data.data.id);
        setCurrentView('patient-profile');
      } else {
        toast.error(data.error || 'Failed to create patient');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
        {/* ─── Card 1: Personal Information ──────────────────────────────── */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-rose-500" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-xs">
              Required fields are marked with *
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="surname"
                rules={{ required: 'Surname is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surname *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Santos"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="firstName"
                rules={{ required: 'First name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Maria Clara"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="middleInitial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Initial</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. R"
                        maxLength={1}
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameExtension"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name Extension</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select extension" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NAME_EXTENSIONS.map((ext) => (
                          <SelectItem key={ext} value={ext} disabled={!ext}>
                            {ext || 'None'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                rules={{ required: 'Date of birth is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-10"
                        max={format(new Date(), 'yyyy-MM-dd')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bloodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BLOOD_TYPES.map((bt) => (
                          <SelectItem key={bt} value={bt}>
                            {bt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Card 2: Address & Contact ─────────────────────────────────── */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-500" />
              Address &amp; Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <FormField
              control={form.control}
              name="address"
              rules={{ required: 'Address is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 123 Rizal Street, Poblacion"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="barangay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barangay</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select barangay" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="max-h-64 overflow-y-auto">
                        {BARANGAYS.map((brgy) => (
                          <SelectItem key={brgy} value={brgy}>
                            {brgy}
                          </SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="e.g. 0917-123-4567"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="e.g. 0918-987-6543"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyRelation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Relation</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Husband, Mother"
                        className="h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ─── Card 3: Demographics ──────────────────────────────────────── */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-500" />
              Demographics
            </CardTitle>
            <CardDescription className="text-xs">
              Social and economic background
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    Occupation
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Teacher, Vendor, Housewife"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="religion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Religion</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select religion" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELIGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MARITAL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="familyComposition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Family Composition</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Number of household members, dependents, etc."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="incomeBracket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Income Bracket</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select income bracket" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INCOME_BRACKETS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ─── Card 4: OB History ─────────────────────────────────────────── */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Baby className="h-4 w-4 text-rose-500" />
              OB History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gravidity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gravidity (G)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="0"
                        className="h-10"
                        {...field}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          field.onChange(isNaN(val) ? '' : String(Math.max(0, Math.min(20, val))));
                        }}
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">
                      Number of pregnancies
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parity (P)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="0"
                        className="h-10"
                        {...field}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          field.onChange(isNaN(val) ? '' : String(Math.max(0, Math.min(20, val))));
                        }}
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">
                      Number of births
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lmp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Menstrual Period (LMP)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-10"
                      max={format(new Date(), 'yyyy-MM-dd')}
                      {...field}
                    />
                  </FormControl>
                  {calculatedAOG && (
                    <p className="text-sm font-medium text-rose-600 flex items-center gap-1">
                      <Droplets className="h-3.5 w-3.5" />
                      Calculated AOG: {calculatedAOG}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ─── Card 5: Health History ─────────────────────────────────────── */}
        <Card className="border border-gray-200/80 dark:border-gray-700/60 bg-white dark:bg-gray-900 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4 bg-rose-50/40 dark:bg-rose-950/20 rounded-t-xl border-b border-rose-100/50 dark:border-rose-900/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              Health History
            </CardTitle>
            <CardDescription className="text-xs">
              Medical background and current health status
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    Allergies
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Penicillin, Sulfa drugs, Latex"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medicalHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Medical History
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Gestational diabetes, Hypertension, Asthma"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="surgicalHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    Surgical History
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Appendectomy (2015), C-section (2020)"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="familyHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Family Health History
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Mother with hypertension, Father with diabetes"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="obstetricHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Baby className="h-3.5 w-3.5 text-muted-foreground" />
                    Obstetric History
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Previous pregnancy complications, mode of delivery, birth outcomes"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="immunizationStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    Immunization Status
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Tetanus toxoid doses, Flu vaccine, COVID-19 vaccine"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentMedications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                    Current Medications
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Folic acid 400mcg daily, Iron supplements"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="healthPractices"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                    Health Practices
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Exercise, diet, smoking, alcohol use"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="socialHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Social History
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Living arrangements, support system, education, employment"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="psychosocialHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <BrainCircuit className="h-3.5 w-3.5 text-muted-foreground" />
                    Psychosocial History
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mental health history, stress factors, coping mechanisms"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ─── Actions ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-4">
          <Button
            type="button"
            variant="outline"
            className="border-rose-200 text-muted-foreground hover:bg-rose-50 gap-2"
            onClick={() => setCurrentView('patients')}
            disabled={isSubmitting}
          >
            <ChevronLeft className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700 text-white gap-2 min-w-[140px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                Add Patient
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
