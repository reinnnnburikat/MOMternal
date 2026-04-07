'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  User,
  MapPin,
  Phone,
  Calendar,
  Baby,
  Droplets,
  AlertTriangle,
  FileText,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

interface NewPatientFormValues {
  name: string;
  dateOfBirth: string;
  address: string;
  contactNumber: string;
  emergencyContact: string;
  emergencyRelation: string;
  barangay: string;
  bloodType: string;
  allergies: string;
  medicalHistory: string;
  gravidity: string;
  parity: string;
  lmp: string;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function NewPatientView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedPatientId = useAppStore((s) => s.setSelectedPatientId);
  const currentNurse = useAppStore((s) => s.currentNurse);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewPatientFormValues>({
    defaultValues: {
      name: '',
      dateOfBirth: '',
      address: '',
      contactNumber: '',
      emergencyContact: '',
      emergencyRelation: '',
      barangay: '',
      bloodType: '',
      allergies: '',
      medicalHistory: '',
      gravidity: '0',
      parity: '0',
      lmp: '',
    },
  });

  const lmpValue = form.watch('lmp');

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
        name: values.name.trim(),
        dateOfBirth: values.dateOfBirth,
        address: values.address.trim(),
        contactNumber: values.contactNumber.trim() || null,
        emergencyContact: values.emergencyContact.trim() || null,
        emergencyRelation: values.emergencyRelation.trim() || null,
        barangay: values.barangay.trim() || null,
        bloodType: values.bloodType || null,
        allergies: values.allergies.trim() || null,
        medicalHistory: values.medicalHistory.trim() || null,
        gravidity: parseInt(values.gravidity, 10) || 0,
        parity: parseInt(values.parity, 10) || 0,
        lmp: values.lmp || null,
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
        {/* Basic Information */}
        <Card className="border-rose-100/60">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-rose-500" />
              Basic Information
            </CardTitle>
            <CardDescription className="text-xs">
              Required fields are marked with *
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Full name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Maria Clara Santos"
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
                          <SelectItem key={bt} value={bt}>{bt}</SelectItem>
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

        {/* Address & Contact */}
        <Card className="border-rose-100/60">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-500" />
              Address & Contact
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="barangay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barangay</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Poblacion"
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* OB History */}
        <Card className="border-rose-100/60">
          <CardHeader className="pb-3 pt-4 px-4">
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
                          field.onChange(isNaN(val) ? '' : String(Math.max(0, val)));
                        }}
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">Number of pregnancies</p>
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
                          field.onChange(isNaN(val) ? '' : String(Math.max(0, val)));
                        }}
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">Number of births</p>
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

        {/* Medical Information */}
        <Card className="border-rose-100/60">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-rose-500" />
              Medical Information
            </CardTitle>
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
                      placeholder="e.g. Penicillin, Sulfa drugs"
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
                  <FormLabel>Medical History</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Gestational diabetes (previous pregnancy), Hypertension"
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

        {/* Actions */}
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
