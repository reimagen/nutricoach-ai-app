'use client';

import { FormProvider } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PersonalDetailsForm } from "./PersonalDetailsForm";
import { GoalsForm } from "./GoalsForm";
import ProfileSkeleton from "./ProfileSkeleton";
import { useProfileForm } from "@/hooks/useProfileForm";

export default function ProfileForm() {
  const { form, loading, isResetting, onSubmit, handleReset } = useProfileForm();

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <PersonalDetailsForm />
          <GoalsForm />
          <div className="flex items-center justify-between">
            <Button type="submit" disabled={loading}>Update Profile</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isResetting}>
                  Reset Profile
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently reset your profile and goal data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Yes, reset</AlertDialogAction>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
