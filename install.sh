#!/usr/bin/env bash
#

root_htaccess="root.htaccess"
parent_htaccess="../.htaccess"
settings_file="settings.inc.php"

metadb="db.sqlite"
basedir="http://localhost/my/data/"
home=`basename \`pwd\`` # 'lodspeakr', the directory from git clone
ns=$basedir
endpoint="http://localhost/sparql?"
everything_ok="n"

if [ -e "$parent_htaccess" ]; then
  echo
  echo "`dirname \`pwd\``/.htaccess already exists."
  echo "Please remove it to continue the installation."
  exit
fi

back_one=`cd .. 2>/dev/null && pwd`
parent=`basename $back_one`

utils/create_db.sh $metadb

while [ "$everything_ok" != "y" ]; do
  echo
  echo "== Basic Information =="
  echo
  echo "LOBI needs to know three (3) URIs to minimally configure itself:"
  echo 
  echo    "(1/3) At what URL will `pwd |sed -e 's/lodspeakr$//'` be available? (e.g. http://localhost/$parent/)"
  echo    "**Note** DO NOT include 'lodspeakr/' in the URL"
  echo -n "(default '$basedir'): "
  read -u 1 aux_basedir
  echo 
  aux_basedir="`echo $aux_basedir | sed 's/\/$//'`/" # remove any ending slash and append one.
  basedir=$aux_basedir

  ns=$basedir
  echo    "(2/3) What local namespace you will use?"
  echo -n "(default '$ns'): "
  read -u 1 aux_ns
  echo ""
  if [ "$aux_ns" != "" ]; then
    ns=$aux_ns
  fi

  external=""
  extra=""
  if [[ "$basedir" =~ ^"$ns" ]]; then
    external="false"
  else
    external=$ns
    extra="\$conf['ns']['base']   = '$basedir';"
  fi
  
  echo    "(3/3) What is the URL of your SPARQL endpoint?"
  echo -n "(default $endpoint): "
  read -u 1 aux_endpoint
  echo ""
  if [ "$aux_endpoint" != "" ]; then
    endpoint=$aux_endpoint
  fi

  echo "== Configuration =="
  echo
  echo "Ok, so I have the following configuration:"
  echo
  echo "Base URL is                        $basedir"
  echo "LOBI is installed at               $basedir$home"
  echo "The local namespace is             $ns"
  echo "Your SPARQL endpoint is located at $endpoint"

  echo
  echo -n "Complete installation? (y/n)? "
  read -u 1 everything_ok
done

if [ -e "$settings_file" ]; then
  ts=`date +%s`
  settings_backup="$settings_file.$ts"
  echo "Making a backup of existing settings at $settings_backup"
  mv $settings_file $settings_backup
fi
  
LODSPEAKR_HOME=`pwd`/
  
  content="<?

\$conf['endpoint']['local'] = '$endpoint';
\$conf['home'] = '$LODSPEAKR_HOME';
\$conf['basedir'] = '$basedir';
\$conf['debug'] = false;
\$conf['mirror_external_uris'] = '$external';

/*ATTENTION: By default this application is available to
 * be exported and copied (its configuration)
 * by others. If you do not want that, 
 * turn the next option as false
 */ 
\$conf['export'] = true;

#If you want to add/overrid a namespace, add it here
\$conf['ns']['local']   = '$ns';
$extra
?>" 
echo "$content" > $settings_file
chmod 644 $settings_file
echo "Created new configuration file: $settings_file"
echo ""
echo "WARNING: Copying $root_htaccess as .htaccess in parent directory"
echo ""
echo "RewriteEngine on" > $parent_htaccess
echo >> $parent_htaccess
echo "RewriteRule ^\$ $1/index.php [L]" >> $parent_htaccess
cat $root_htaccess >> $parent_htaccess
echo "RewriteRule ^(.+)\$ $1/index.php?q=\$1 [L]" >> $parent_htaccess
mkdir cache
cp -r doc/examples/originalComponents components
mkdir -p components/uris

echo
echo "                                      *** ATTENTION ***"
echo
echo "LOBI needs the web server to have write permissions for $1/cache/ and $1/meta/."
echo
echo
echo "Common ways of doing this:"
echo " chown -R www-apache $1/cache $1/meta (find the name of the apache user in your system)"
echo " chmod -R g+w $1/cache $1/meta (if you have a group in common with the apache user)"
echo " chmod -R 777 $1/cache $1/meta (highly discouraged but useful to test when everything fails. It shouldn't be used in production sites)"
echo
echo "Please give the server write permissions. Otherwise, LOBI will not work."
echo
echo "You can now visit $basedir to navigate through your data."
