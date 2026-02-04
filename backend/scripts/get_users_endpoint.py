
@router.get("/{installed_app_id}/users", response_model=List[User])
def get_app_users(
    installed_app_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get list of users who have access to this app.
    Only Admins can view this.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can view app users")

    users = session.exec(
        select(User)
        .join(AppAccess)
        .where(AppAccess.installed_app_id == installed_app_id)
        .where(User.company_id == current_user.company_id)
    ).all()
    
    return users
